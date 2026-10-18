/**
 * Phoenix Labs Academy — Cloudflare Edge Worker API
 *
 * Powered by Hono and Cloudflare D1. Serves the curriculum API, isolates solution flags
 * on the edge, tracks granular learner progress, and enforces cryptographic
 * Cloudflare Zero Trust authentication and session identity resolution.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables, IngestModulePayload, TrackRecord } from './types';
import { resolveRequestIdentity } from './auth';
import {
  fetchCurriculumOverview,
  fetchModuleAndMarkInProgress,
  fetchStudentProfileData,
  ingestBundleOrModule,
  updateModuleAutosave,
  upsertStudentRecord,
  verifyModuleSubmission
} from './db';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS for local Vite development and edge routing
app.use('/api/*', cors());

/**
 * Cryptographic Authentication & Session Identity Middleware
 *
 * 1. Verifies Cloudflare Access RS256 JWT (`Cf-Access-Jwt-Assertion`) against
 *    `https://<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs` when configured, or
 *    extracts the edge-injected `Cf-Access-Authenticated-User-Email` header.
 * 2. When operating standalone without a Zero Trust gateway, derives a deterministic
 *    cryptographic SHA-256 session identity (`OP-<8-HEX>`) — never a placeholder email.
 */
app.use('/api/*', async (c, next) => {
  const identity = await resolveRequestIdentity(
    { header: (name: string) => c.req.header(name) },
    c.env
  );

  c.set('studentId', identity.id);
  c.set('studentEmail', identity.identityLabel);
  c.set('displayName', identity.displayName);
  c.set('zeroTrustEnforced', identity.zeroTrustEnforced);
  c.set('isAdmin', identity.isAdmin);

  // Upsert student activity record in Cloudflare D1 / edge store
  try {
    await upsertStudentRecord(
      c.env.DB,
      identity.id,
      identity.identityLabel,
      identity.displayName
    );
  } catch (err) {
    console.error('Failed to update student profile in storage:', err);
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
  const studentId = c.get('studentId');
  const { tracks, modules } = await fetchCurriculumOverview(c.env.DB, studentId);

  return c.json({
    student: {
      email: c.get('studentEmail'),
      isAdmin: c.get('isAdmin'),
      zero_trust_enforced: c.get('zeroTrustEnforced')
    },
    tracks,
    modules
  });
});

/**
 * GET /api/student/profile
 * Comprehensive Student Profile and Cross-Course Progress Telemetry
 * Aggregates completion across all tracks, individual modules, time invested,
 * and recent audit/activity history.
 */
app.get('/api/student/profile', async (c) => {
  const studentId = c.get('studentId');
  const studentEmail = c.get('studentEmail');
  const displayName = c.get('displayName');
  const isAdmin = c.get('isAdmin');
  const zeroTrustEnforced = c.get('zeroTrustEnforced');

  const { studentRecord, tracks, modules, recentActivity } = await fetchStudentProfileData(
    c.env.DB,
    studentId
  );

  // Calculate Global Rollup Metrics
  const totalModules = modules.length;
  const completedModules = modules.filter((m: any) => m.status === 'completed').length;
  const inProgressModules = modules.filter((m: any) => m.status === 'in_progress').length;
  const notStartedModules = modules.filter((m: any) => m.status === 'not_started').length;
  const totalTimeSpentSeconds = modules.reduce(
    (sum: number, m: any) => sum + (m.time_spent_seconds || 0),
    0
  );
  const totalAttempts = modules.reduce((sum: number, m: any) => sum + (m.attempts || 0), 0);

  // Group modules by track with domain-level analytics
  const tracksWithProgress = tracks.map((track) => {
    const trackMods = modules.filter((m: any) => m.track_id === track.id);
    const completedCount = trackMods.filter((m: any) => m.status === 'completed').length;
    const inProgressCount = trackMods.filter((m: any) => m.status === 'in_progress').length;
    const completionPct =
      trackMods.length > 0 ? Math.round((completedCount / trackMods.length) * 100) : 0;
    const trackTimeSpent = trackMods.reduce(
      (sum: number, m: any) => sum + (m.time_spent_seconds || 0),
      0
    );

    return {
      ...track,
      modules: trackMods,
      total_modules: trackMods.length,
      completed_count: completedCount,
      in_progress_count: inProgressCount,
      completion_pct: completionPct,
      time_spent_seconds: trackTimeSpent
    };
  });

  return c.json({
    student: {
      id: studentId,
      email: studentRecord?.email || studentEmail,
      display_name: studentRecord?.display_name || displayName,
      created_at: studentRecord?.created_at || new Date().toISOString(),
      last_active_at: studentRecord?.last_active_at || new Date().toISOString(),
      isAdmin,
      zero_trust_enforced: zeroTrustEnforced
    },
    overview: {
      total_tracks: tracks.length,
      completed_tracks: tracksWithProgress.filter((t) => t.completion_pct === 100).length,
      total_modules: totalModules,
      completed_modules: completedModules,
      in_progress_modules: inProgressModules,
      not_started_modules: notStartedModules,
      global_completion_pct:
        totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      total_time_spent_seconds: totalTimeSpentSeconds,
      total_attempts: totalAttempts
    },
    tracks: tracksWithProgress,
    recent_activity: recentActivity
  });
});

/**
 * GET /api/modules/:slug
 * Retrieves theory content and safe lab configuration for a module.
 * Automatically marks the module as 'in_progress' and loads saved lab state.
 * Crucially strips `expected_flag` to prevent answer leakage in client responses.
 */
app.get('/api/modules/:slug', async (c) => {
  const studentId = c.get('studentId');
  const slug = c.req.param('slug');

  const result = await fetchModuleAndMarkInProgress(c.env.DB, studentId, slug);
  if (!result) {
    return c.json({ error: 'Module not found' }, 404);
  }

  const { mod, progress } = result;

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
  const studentId = c.get('studentId');
  const moduleId = c.req.param('id');
  const { elapsed_seconds, hints_used, saved_lab_state } = await c.req.json();

  await updateModuleAutosave(
    c.env.DB,
    studentId,
    moduleId,
    elapsed_seconds || 0,
    hints_used,
    saved_lab_state
  );

  return c.json({ ok: true });
});

/**
 * POST /api/modules/:id/verify
 * Server-Side Lab Flag & Quiz Answer Verification
 * Compares learner submission against expected_flag stored strictly on the server.
 * Increments attempts and commits completion telemetry upon success.
 */
app.post('/api/modules/:id/verify', async (c) => {
  const studentId = c.get('studentId');
  const moduleId = c.req.param('id');
  const { submission } = await c.req.json<{ submission: string }>();

  if (!submission || typeof submission !== 'string') {
    return c.json({ error: 'Submission payload is required' }, 400);
  }

  const verification = await verifyModuleSubmission(
    c.env.DB,
    studentId,
    moduleId,
    submission
  );

  if (!verification.found) {
    return c.json({ error: 'Module not found' }, 404);
  }

  return c.json({
    correct: Boolean(verification.isCorrect),
    message: verification.isCorrect
      ? 'Verification successful. Telemetry committed to Cloudflare D1.'
      : 'Verification mismatch. Review the telemetry output or examine the module hint.'
  });
});

/**
 * POST /api/admin/ingest
 * Ingestion Endpoint for Research Packages & Full Course Bundles
 * Protected by dedicated admin check; parses JSON payload (single module or course bundle) and commits to storage.
 */
app.post('/api/admin/ingest', requireAdmin, async (c) => {
  const body = await c.req.json<any>();

  // Case 1: Multi-Module Course Bundle ({ track?: ..., tracks?: [...], modules: [...] })
  if (Array.isArray(body.modules)) {
    if (body.modules.length === 0) {
      return c.json(
        { error: 'Course bundle must contain at least one module in "modules" array' },
        400
      );
    }

    const tracksToUpsert: TrackRecord[] = [
      ...(body.track ? [body.track] : []),
      ...(Array.isArray(body.tracks) ? body.tracks : [])
    ];

    for (const mod of body.modules as IngestModulePayload[]) {
      if (
        !mod.id ||
        !mod.track_id ||
        !mod.slug ||
        !mod.title ||
        !mod.lab_type ||
        !mod.expected_flag
      ) {
        return c.json(
          {
            error: `Module "${mod.id || mod.title || 'unknown'}" is missing mandatory curriculum fields`
          },
          400
        );
      }
    }

    await ingestBundleOrModule(c.env.DB, tracksToUpsert, body.modules);
    return c.json({
      ingested: true,
      bundle: true,
      tracks_ingested: tracksToUpsert.length,
      modules_ingested: body.modules.length
    });
  }

  // Case 2: Single Module Payload
  if (
    !body.id ||
    !body.track_id ||
    !body.slug ||
    !body.title ||
    !body.lab_type ||
    !body.expected_flag
  ) {
    return c.json({ error: 'Missing mandatory curriculum fields' }, 400);
  }

  await ingestBundleOrModule(c.env.DB, [], [body as IngestModulePayload]);
  return c.json({ ingested: true, id: body.id });
});

export default app;
