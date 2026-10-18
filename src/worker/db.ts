/**
 * Phoenix Labs Academy — Self-Healing Edge Storage & D1 Persistence Layer
 *
 * Ensures zero-failure deployments on Cloudflare Workers:
 * 1. When a Cloudflare D1 database (`c.env.DB`) is bound, automatically initializes
 *    relational tables (`CREATE TABLE IF NOT EXISTS`) and seeds the 3-track, 26-module
 *    curriculum on first access if not yet populated.
 * 2. When deployed to Cloudflare prior to attaching a D1 database binding, seamlessly
 *    operates against an in-isolate relational store pre-seeded with the full curriculum.
 */

import type { IngestModulePayload, ModuleRecord, StudentRecord, TrackRecord } from './types';
import { SEED_MODULES, SEED_TRACKS } from './curriculum-seed';

interface ProgressRecord {
  student_id: string;
  module_id: string;
  track_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  attempts: number;
  hints_used: number;
  saved_lab_state_json: string;
  time_spent_seconds: number;
  started_at: string;
  last_accessed_at: string;
  completed_at: string | null;
}

// In-isolate fallback state when D1 binding is not yet attached in Cloudflare Dashboard
const memoryTracks = new Map<string, TrackRecord>();
const memoryModules = new Map<string, ModuleRecord>();
const memoryStudents = new Map<string, StudentRecord>();
const memoryProgress = new Map<string, ProgressRecord>();
let memorySeeded = false;
let d1Bootstrapped = false;

function ensureMemorySeeded() {
  if (memorySeeded) return;
  for (const t of SEED_TRACKS) {
    memoryTracks.set(t.id, { ...t });
  }
  for (const m of SEED_MODULES) {
    memoryModules.set(m.id, {
      id: m.id,
      track_id: m.track_id,
      slug: m.slug,
      title: m.title,
      difficulty: m.difficulty || 'Intermediate',
      order_index: m.order_index || 1,
      estimated_minutes: m.estimated_minutes || 20,
      theory_json: JSON.stringify(m.theory_sections || []),
      lab_type: m.lab_type,
      lab_briefing: m.lab_briefing || '',
      lab_config_json:
        typeof m.lab_config === 'string' ? m.lab_config : JSON.stringify(m.lab_config || {}),
      expected_flag: m.expected_flag,
      hint: m.hint || ''
    });
  }
  memorySeeded = true;
}

/**
 * Automatically creates tables and seeds the 26-module curriculum in Cloudflare D1
 * if the bound D1 database is uninitialized or has outdated starter counts.
 */
export async function ensureD1Bootstrapped(db: D1Database): Promise<void> {
  if (d1Bootstrapped) return;

  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        description TEXT NOT NULL,
        order_index INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        difficulty TEXT CHECK(difficulty IN ('Fundamentals', 'Intermediate', 'Advanced')) NOT NULL,
        order_index INTEGER NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        theory_json TEXT NOT NULL,
        lab_type TEXT CHECK(lab_type IN ('terminal', 'siem', 'hex_inspector', 'quiz')) NOT NULL,
        lab_briefing TEXT NOT NULL,
        lab_config_json TEXT NOT NULL,
        expected_flag TEXT NOT NULL,
        hint TEXT NOT NULL,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS student_module_progress (
        student_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        status TEXT CHECK(status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'in_progress',
        attempts INTEGER DEFAULT 0,
        hints_used INTEGER DEFAULT 0,
        saved_lab_state_json TEXT DEFAULT '{}',
        time_spent_seconds INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        PRIMARY KEY (student_id, module_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      )`)
    ]);

    const countRow = await db
      .prepare(`SELECT COUNT(*) as cnt FROM modules WHERE track_id = 'track-pentest'`)
      .first<{ cnt: number }>();

    if (!countRow || Number(countRow.cnt) < 22) {
      const seedStatements: D1PreparedStatement[] = [];
      for (const trk of SEED_TRACKS) {
        seedStatements.push(
          db
            .prepare(
              `INSERT OR REPLACE INTO tracks (id, slug, title, subtitle, description, order_index)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(trk.id, trk.slug, trk.title, trk.subtitle, trk.description, trk.order_index)
        );
      }

      for (const mod of SEED_MODULES) {
        seedStatements.push(
          db
            .prepare(
              `INSERT OR REPLACE INTO modules
               (id, track_id, slug, title, difficulty, order_index, estimated_minutes, theory_json, lab_type, lab_briefing, lab_config_json, expected_flag, hint)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              mod.id,
              mod.track_id,
              mod.slug,
              mod.title,
              mod.difficulty || 'Intermediate',
              mod.order_index || 1,
              mod.estimated_minutes || 20,
              JSON.stringify(mod.theory_sections || []),
              mod.lab_type,
              mod.lab_briefing || '',
              typeof mod.lab_config === 'string'
                ? mod.lab_config
                : JSON.stringify(mod.lab_config || {}),
              mod.expected_flag,
              mod.hint || ''
            )
        );
      }

      await db.batch(seedStatements);
    }

    d1Bootstrapped = true;
  } catch (err) {
    console.error('D1 bootstrap check encountered an error:', err);
  }
}

export async function upsertStudentRecord(
  db: D1Database | undefined,
  studentId: string,
  identityLabel: string,
  displayName: string
): Promise<void> {
  if (db) {
    await ensureD1Bootstrapped(db);
    await db
      .prepare(
        `INSERT INTO students (id, email, display_name, last_active_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET last_active_at = CURRENT_TIMESTAMP`
      )
      .bind(studentId, identityLabel, displayName)
      .run();
    return;
  }

  ensureMemorySeeded();
  const now = new Date().toISOString();
  const existing = memoryStudents.get(studentId);
  memoryStudents.set(studentId, {
    id: studentId,
    email: identityLabel,
    display_name: displayName,
    created_at: existing?.created_at || now,
    last_active_at: now
  });
}

export async function fetchCurriculumOverview(db: D1Database | undefined, studentId: string) {
  if (db) {
    await ensureD1Bootstrapped(db);
    const { results: tracks } = await db
      .prepare(`SELECT * FROM tracks ORDER BY order_index ASC`)
      .all<TrackRecord>();

    const { results: modules } = await db
      .prepare(
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

    return { tracks, modules };
  }

  ensureMemorySeeded();
  const tracks = Array.from(memoryTracks.values()).sort((a, b) => a.order_index - b.order_index);
  const modules = Array.from(memoryModules.values())
    .sort((a, b) => a.order_index - b.order_index)
    .map((m) => {
      const p = memoryProgress.get(`${studentId}:${m.id}`);
      return {
        id: m.id,
        track_id: m.track_id,
        slug: m.slug,
        title: m.title,
        difficulty: m.difficulty,
        order_index: m.order_index,
        estimated_minutes: m.estimated_minutes,
        lab_type: m.lab_type,
        status: p?.status || 'not_started',
        attempts: p?.attempts || 0,
        time_spent_seconds: p?.time_spent_seconds || 0,
        completed_at: p?.completed_at || null
      };
    });

  return { tracks, modules };
}

export async function fetchStudentProfileData(db: D1Database | undefined, studentId: string) {
  if (db) {
    await ensureD1Bootstrapped(db);
    const studentRecord = await db
      .prepare(
        `SELECT id, email, display_name, created_at, last_active_at FROM students WHERE id = ?`
      )
      .bind(studentId)
      .first<StudentRecord>();

    const { results: tracks } = await db
      .prepare(`SELECT * FROM tracks ORDER BY order_index ASC`)
      .all<TrackRecord>();

    const { results: modules } = await db
      .prepare(
        `SELECT m.id, m.track_id, m.slug, m.title, m.difficulty, m.order_index,
                m.estimated_minutes, m.lab_type,
                COALESCE(p.status, 'not_started') as status,
                COALESCE(p.attempts, 0) as attempts,
                COALESCE(p.hints_used, 0) as hints_used,
                COALESCE(p.time_spent_seconds, 0) as time_spent_seconds,
                p.started_at,
                p.last_accessed_at,
                p.completed_at
         FROM modules m
         LEFT JOIN student_module_progress p
           ON m.id = p.module_id AND p.student_id = ?
         ORDER BY m.order_index ASC`
      )
      .bind(studentId)
      .all<any>();

    const { results: recentActivity } = await db
      .prepare(
        `SELECT p.module_id, p.track_id, p.status, p.attempts, p.last_accessed_at, p.completed_at,
                m.title as module_title, m.slug as module_slug, m.lab_type,
                t.title as track_title
         FROM student_module_progress p
         JOIN modules m ON p.module_id = m.id
         JOIN tracks t ON p.track_id = t.id
         WHERE p.student_id = ?
         ORDER BY p.last_accessed_at DESC
         LIMIT 10`
      )
      .bind(studentId)
      .all<any>();

    return { studentRecord, tracks, modules, recentActivity };
  }

  ensureMemorySeeded();
  const studentRecord = memoryStudents.get(studentId) || null;
  const tracks = Array.from(memoryTracks.values()).sort((a, b) => a.order_index - b.order_index);
  const modules = Array.from(memoryModules.values())
    .sort((a, b) => a.order_index - b.order_index)
    .map((m) => {
      const p = memoryProgress.get(`${studentId}:${m.id}`);
      return {
        id: m.id,
        track_id: m.track_id,
        slug: m.slug,
        title: m.title,
        difficulty: m.difficulty,
        order_index: m.order_index,
        estimated_minutes: m.estimated_minutes,
        lab_type: m.lab_type,
        status: p?.status || 'not_started',
        attempts: p?.attempts || 0,
        hints_used: p?.hints_used || 0,
        time_spent_seconds: p?.time_spent_seconds || 0,
        started_at: p?.started_at || null,
        last_accessed_at: p?.last_accessed_at || null,
        completed_at: p?.completed_at || null
      };
    });

  const recentActivity = Array.from(memoryProgress.values())
    .filter((p) => p.student_id === studentId)
    .sort((a, b) => b.last_accessed_at.localeCompare(a.last_accessed_at))
    .slice(0, 10)
    .map((p) => {
      const mod = memoryModules.get(p.module_id);
      const trk = memoryTracks.get(p.track_id);
      return {
        module_id: p.module_id,
        track_id: p.track_id,
        status: p.status,
        attempts: p.attempts,
        last_accessed_at: p.last_accessed_at,
        completed_at: p.completed_at,
        module_title: mod?.title || p.module_id,
        module_slug: mod?.slug || p.module_id,
        lab_type: mod?.lab_type || 'terminal',
        track_title: trk?.title || p.track_id
      };
    });

  return { studentRecord, tracks, modules, recentActivity };
}

export async function fetchModuleAndMarkInProgress(
  db: D1Database | undefined,
  studentId: string,
  slug: string
) {
  if (db) {
    await ensureD1Bootstrapped(db);
    const mod = await db
      .prepare(
        `SELECT id, track_id, slug, title, difficulty, estimated_minutes,
                theory_json, lab_type, lab_briefing, lab_config_json, hint
         FROM modules WHERE slug = ?`
      )
      .bind(slug)
      .first<any>();

    if (!mod) return null;

    await db
      .prepare(
        `INSERT INTO student_module_progress (student_id, module_id, track_id, status, started_at, last_accessed_at)
         VALUES (?, ?, ?, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(student_id, module_id) DO UPDATE SET
           last_accessed_at = CURRENT_TIMESTAMP`
      )
      .bind(studentId, mod.id, mod.track_id)
      .run();

    const progress = await db
      .prepare(
        `SELECT status, attempts, hints_used, saved_lab_state_json, time_spent_seconds, completed_at
         FROM student_module_progress
         WHERE student_id = ? AND module_id = ?`
      )
      .bind(studentId, mod.id)
      .first<any>();

    return { mod, progress };
  }

  ensureMemorySeeded();
  const mod = Array.from(memoryModules.values()).find((m) => m.slug === slug);
  if (!mod) return null;

  const key = `${studentId}:${mod.id}`;
  const now = new Date().toISOString();
  const existing = memoryProgress.get(key);
  const progress: ProgressRecord = existing
    ? { ...existing, last_accessed_at: now }
    : {
        student_id: studentId,
        module_id: mod.id,
        track_id: mod.track_id,
        status: 'in_progress',
        attempts: 0,
        hints_used: 0,
        saved_lab_state_json: '{}',
        time_spent_seconds: 0,
        started_at: now,
        last_accessed_at: now,
        completed_at: null
      };
  memoryProgress.set(key, progress);

  const { expected_flag: _stripped, ...safeMod } = mod;
  return { mod: safeMod, progress };
}

export async function updateModuleAutosave(
  db: D1Database | undefined,
  studentId: string,
  moduleId: string,
  elapsedSeconds: number,
  hintsUsed: number | undefined,
  savedLabState: unknown
) {
  if (db) {
    await ensureD1Bootstrapped(db);
    await db
      .prepare(
        `UPDATE student_module_progress
         SET time_spent_seconds = time_spent_seconds + ?,
             hints_used = COALESCE(?, hints_used),
             saved_lab_state_json = COALESCE(?, saved_lab_state_json),
             last_accessed_at = CURRENT_TIMESTAMP
         WHERE student_id = ? AND module_id = ?`
      )
      .bind(
        elapsedSeconds || 0,
        hintsUsed ?? null,
        savedLabState ? JSON.stringify(savedLabState) : null,
        studentId,
        moduleId
      )
      .run();
    return;
  }

  ensureMemorySeeded();
  const key = `${studentId}:${moduleId}`;
  const existing = memoryProgress.get(key);
  if (existing) {
    existing.time_spent_seconds += elapsedSeconds || 0;
    if (hintsUsed !== undefined) existing.hints_used = hintsUsed;
    if (savedLabState !== undefined) existing.saved_lab_state_json = JSON.stringify(savedLabState);
    existing.last_accessed_at = new Date().toISOString();
  }
}

export async function verifyModuleSubmission(
  db: D1Database | undefined,
  studentId: string,
  moduleId: string,
  submission: string
): Promise<{ found: boolean; isCorrect?: boolean }> {
  if (db) {
    await ensureD1Bootstrapped(db);
    const mod = await db
      .prepare(`SELECT id, track_id, expected_flag FROM modules WHERE id = ?`)
      .bind(moduleId)
      .first<{ id: string; track_id: string; expected_flag: string }>();

    if (!mod) return { found: false };

    const isCorrect =
      submission.trim().toLowerCase() === mod.expected_flag.trim().toLowerCase();

    await db
      .prepare(
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

    return { found: true, isCorrect };
  }

  ensureMemorySeeded();
  const mod = memoryModules.get(moduleId);
  if (!mod) return { found: false };

  const isCorrect =
    submission.trim().toLowerCase() === mod.expected_flag.trim().toLowerCase();
  const key = `${studentId}:${moduleId}`;
  const now = new Date().toISOString();
  const existing = memoryProgress.get(key);

  if (existing) {
    existing.attempts += 1;
    if (isCorrect) {
      existing.status = 'completed';
      existing.completed_at = now;
    }
    existing.last_accessed_at = now;
  } else {
    memoryProgress.set(key, {
      student_id: studentId,
      module_id: moduleId,
      track_id: mod.track_id,
      status: isCorrect ? 'completed' : 'in_progress',
      attempts: 1,
      hints_used: 0,
      saved_lab_state_json: '{}',
      time_spent_seconds: 0,
      started_at: now,
      last_accessed_at: now,
      completed_at: isCorrect ? now : null
    });
  }

  return { found: true, isCorrect };
}

export async function ingestBundleOrModule(
  db: D1Database | undefined,
  tracksToUpsert: TrackRecord[],
  modulesToUpsert: IngestModulePayload[]
) {
  if (db) {
    await ensureD1Bootstrapped(db);
    const statements: D1PreparedStatement[] = [];

    for (const trk of tracksToUpsert) {
      if (trk && trk.id && trk.title) {
        statements.push(
          db
            .prepare(
              `INSERT OR REPLACE INTO tracks (id, slug, title, subtitle, description, order_index)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
              trk.id,
              trk.slug || trk.id,
              trk.title,
              trk.subtitle || '',
              trk.description || '',
              trk.order_index || 1
            )
        );
      }
    }

    for (const mod of modulesToUpsert) {
      statements.push(
        db
          .prepare(
            `INSERT OR REPLACE INTO modules
             (id, track_id, slug, title, difficulty, order_index, estimated_minutes, theory_json, lab_type, lab_briefing, lab_config_json, expected_flag, hint)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            mod.id,
            mod.track_id,
            mod.slug,
            mod.title,
            mod.difficulty || 'Intermediate',
            mod.order_index || 10,
            mod.estimated_minutes || 20,
            JSON.stringify(mod.theory_sections || []),
            mod.lab_type,
            mod.lab_briefing || '',
            typeof mod.lab_config === 'string'
              ? mod.lab_config
              : JSON.stringify(mod.lab_config || {}),
            mod.expected_flag,
            mod.hint || ''
          )
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }
    return;
  }

  ensureMemorySeeded();
  for (const trk of tracksToUpsert) {
    if (trk && trk.id && trk.title) {
      memoryTracks.set(trk.id, {
        id: trk.id,
        slug: trk.slug || trk.id,
        title: trk.title,
        subtitle: trk.subtitle || '',
        description: trk.description || '',
        order_index: trk.order_index || 1
      });
    }
  }
  for (const mod of modulesToUpsert) {
    memoryModules.set(mod.id, {
      id: mod.id,
      track_id: mod.track_id,
      slug: mod.slug,
      title: mod.title,
      difficulty: mod.difficulty || 'Intermediate',
      order_index: mod.order_index || 10,
      estimated_minutes: mod.estimated_minutes || 20,
      theory_json: JSON.stringify(mod.theory_sections || []),
      lab_type: mod.lab_type,
      lab_briefing: mod.lab_briefing || '',
      lab_config_json:
        typeof mod.lab_config === 'string' ? mod.lab_config : JSON.stringify(mod.lab_config || {}),
      expected_flag: mod.expected_flag,
      hint: mod.hint || ''
    });
  }
}
