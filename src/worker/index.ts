/**
 * Phoenix Labs Academy — Cloudflare Edge Worker API
 * 
 * Powered by Hono and Cloudflare D1. Serves the curriculum API, isolates solution flags
 * on the edge, tracks granular learner progress, and enforces Cloudflare Zero Trust authentication.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables, IngestModulePayload } from './types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS for local Vite development and edge routing
app.use('/api/*', cors());

/**
 * Cloudflare Zero Trust Authentication Middleware
 * 
 * Extracts the cryptographically asserted user identity injected by Cloudflare Access
 * via the `Cf-Access-Authenticated-User-Email` header.
 * 
 * For offline development via `wrangler dev`, falls back gracefully to `local-operator@localhost`.
 * Checks the configured `ADMIN_EMAILS` allowlist to determine administrator privileges.
 */
app.use('/api/*', async (c, next) => {
  const cfEmail =
    c.req.header('Cf-Access-Authenticated-User-Email') || 'local-operator@localhost';
  const displayName = cfEmail.split('@')[0];

  // Resolve admin status against dedicated allowlist
  const adminList = (c.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminList.includes(cfEmail.toLowerCase());

  c.set('studentEmail', cfEmail);
  c.set('isAdmin', isAdmin);

  // Upsert student activity record in Cloudflare D1
  try {
    await c.env.DB.prepare(
      `INSERT INTO students (id, email, display_name, last_active_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET last_active_at = CURRENT_TIMESTAMP`
    )
      .bind(cfEmail, cfEmail, displayName)
      .run();
  } catch (err) {
    console.error('Failed to update student profile in D1:', err);
  }

  await next();
});

/**
 * Dedicated Admin Authorization Gate for /api/admin/*
 * Prevents unprivileged learners from altering or injecting course curriculum.
 */
const requireAdmin = async (c: any, next: () => Promise<void>) => {
  if (!c.get('isAdmin')) {
    return c.json(
      {
        error: 'Forbidden: Admin access required',
        authenticated_user: c.get('studentEmail')
      },
      403
    );
  }
  await next();
};

/**
 * GET /api/curriculum
 * Returns all active tracks, modules, the authenticated learner's progress, and overall rollup metrics.
 */
app.get('/api/curriculum', async (c) => {
  const studentId = c.get('studentEmail');

  const { results: tracks } = await c.env.DB.prepare(
    `SELECT * FROM tracks ORDER BY order_index ASC`
  ).all();

  const { results: modules } = await c.env.DB.prepare(
    `SELECT m.id, m.track_id, m.slug, m.title, m.difficulty, m.order_index,
            m.estimated_minutes, m.lab_type,
            COALESCE(p.status, 'not_started') as status,
            COALESCE(p.attempts, 0) as attempts,
            COALESCE(p.time_spent_seconds, 0) as time_spent_seconds,
            p.completed_at
     FROM modules m
     LEFT JOIN student_module_progress p
       ON m.id = p.module_id AND p.student_id = ?
     ORDER BY m.order_index ASC`
  )
    .bind(studentId)
    .all();

  return c.json({
    student: {
      email: studentId,
      isAdmin: c.get('isAdmin'),
      zero_trust_enforced: Boolean(c.req.header('Cf-Access-Authenticated-User-Email'))
    },
    tracks,
    modules
  });
});

/**
 * GET /api/modules/:slug
 * Retrieves theory content and safe lab configuration for a module.
 * Automatically marks the module as 'in_progress' and loads saved lab state.
 * Crucially strips `expected_flag` to prevent answer leakage in client responses.
 */
app.get('/api/modules/:slug', async (c) => {
  const studentId = c.get('studentEmail');
  const slug = c.req.param('slug');

  const mod = await c.env.DB.prepare(
    `SELECT id, track_id, slug, title, difficulty, estimated_minutes,
            theory_json, lab_type, lab_briefing, lab_config_json, hint
     FROM modules WHERE slug = ?`
  )
    .bind(slug)
    .first<any>();

  if (!mod) {
    return c.json({ error: 'Module not found' }, 404);
  }

  // Record that the learner has opened/resumed this module
  await c.env.DB.prepare(
    `INSERT INTO student_module_progress (student_id, module_id, track_id, status, started_at, last_accessed_at)
     VALUES (?, ?, ?, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id, module_id) DO UPDATE SET
       last_accessed_at = CURRENT_TIMESTAMP`
  )
    .bind(studentId, mod.id, mod.track_id)
    .run();

  const progress = await c.env.DB.prepare(
    `SELECT status, attempts, hints_used, saved_lab_state_json, time_spent_seconds, completed_at
     FROM student_module_progress
     WHERE student_id = ? AND module_id = ?`
  )
    .bind(studentId, mod.id)
    .first<any>();

  let parsedTheory = [];
  try {
    parsedTheory = JSON.parse(mod.theory_json);
  } catch {
    parsedTheory = [{ heading: 'Curriculum Theory', body: mod.theory_json }];
  }

  let parsedLabConfig = {};
  try {
    parsedLabConfig = JSON.parse(mod.lab_config_json);
  } catch {
    parsedLabConfig = {};
  }

  return c.json({
    ...mod,
    theory_sections: parsedTheory,
    lab_config: parsedLabConfig,
    progress: {
      ...progress,
      saved_lab_state: progress?.saved_lab_state_json
        ? JSON.parse(progress.saved_lab_state_json)
        : {}
    }
  });
});

/**
 * PATCH /api/modules/:id/autosave
 * 30-Second Heartbeat & State Synchronization
 * Persists learner command history, notes, hints used, and cumulative time spent.
 */
app.patch('/api/modules/:id/autosave', async (c) => {
  const studentId = c.get('studentEmail');
  const moduleId = c.req.param('id');
  const { elapsed_seconds, hints_used, saved_lab_state } = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE student_module_progress
     SET time_spent_seconds = time_spent_seconds + ?,
         hints_used = COALESCE(?, hints_used),
         saved_lab_state_json = COALESCE(?, saved_lab_state_json),
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND module_id = ?`
  )
    .bind(
      elapsed_seconds || 0,
      hints_used ?? null,
      saved_lab_state ? JSON.stringify(saved_lab_state) : null,
      studentId,
      moduleId
    )
    .run();

  return c.json({ ok: true });
});

/**
 * POST /api/modules/:id/verify
 * Server-Side Lab Flag & Quiz Answer Verification
 * Compares learner submission against expected_flag stored strictly in D1.
 * Increments attempts and commits completion telemetry upon success.
 */
app.post('/api/modules/:id/verify', async (c) => {
  const studentId = c.get('studentEmail');
  const moduleId = c.req.param('id');
  const { submission } = await c.req.json<{ submission: string }>();

  if (!submission || typeof submission !== 'string') {
    return c.json({ error: 'Submission payload is required' }, 400);
  }

  const mod = await c.env.DB.prepare(
    `SELECT id, track_id, expected_flag FROM modules WHERE id = ?`
  )
    .bind(moduleId)
    .first<{ id: string; track_id: string; expected_flag: string }>();

  if (!mod) {
    return c.json({ error: 'Module not found' }, 404);
  }

  const isCorrect =
    submission.trim().toLowerCase() === mod.expected_flag.trim().toLowerCase();

  await c.env.DB.prepare(
    `INSERT INTO student_module_progress (student_id, module_id, track_id, status, attempts, completed_at, last_accessed_at)
     VALUES (?, ?, ?, ?, 1, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id, module_id) DO UPDATE SET
       attempts = student_module_progress.attempts + 1,
       status = CASE WHEN ? THEN 'completed' ELSE student_module_progress.status END,
       completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE student_module_progress.completed_at END,
       last_accessed_at = CURRENT_TIMESTAMP`
  )
    .bind(
      studentId,
      moduleId,
      mod.track_id,
      isCorrect ? 'completed' : 'in_progress',
      isCorrect ? 1 : 0,
      isCorrect ? 1 : 0,
      isCorrect ? 1 : 0
    )
    .run();

  return c.json({
    correct: isCorrect,
    message: isCorrect
      ? 'Verification successful. Telemetry committed to Cloudflare D1.'
      : 'Verification mismatch. Review the telemetry output or examine the module hint.'
  });
});

/**
 * POST /api/admin/ingest
 * Ingestion Endpoint for Research Packages
 * Protected by dedicated admin check; parses JSON payload and commits to D1.
 */
app.post('/api/admin/ingest', requireAdmin, async (c) => {
  const body = (await c.req.json()) as IngestModulePayload;

  if (!body.id || !body.track_id || !body.slug || !body.title || !body.lab_type || !body.expected_flag) {
    return c.json({ error: 'Missing mandatory curriculum fields' }, 400);
  }

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO modules
     (id, track_id, slug, title, difficulty, order_index, estimated_minutes, theory_json, lab_type, lab_briefing, lab_config_json, expected_flag, hint)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.id,
      body.track_id,
      body.slug,
      body.title,
      body.difficulty,
      body.order_index || 10,
      body.estimated_minutes || 20,
      JSON.stringify(body.theory_sections || []),
      body.lab_type,
      body.lab_briefing || '',
      JSON.stringify(body.lab_config || {}),
      body.expected_flag,
      body.hint || ''
    )
    .run();

  return c.json({ ingested: true, id: body.id });
});

export default app;
