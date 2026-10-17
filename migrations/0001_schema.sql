-- =============================================================================
-- Migration 0001: Cloudflare D1 Relational Schema for Phoenix Labs Academy
-- Tracks, Modules, Zero Trust Student Profiles, and Granular Progress Telemetry
-- =============================================================================

DROP TABLE IF EXISTS student_module_progress;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS tracks;

-- 1. Core Cyber Operation Tracks
CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

-- 2. Curriculum Modules & Polymorphic Lab Payloads
CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('Fundamentals', 'Intermediate', 'Advanced')) NOT NULL,
    order_index INTEGER NOT NULL,
    estimated_minutes INTEGER NOT NULL,
    theory_json TEXT NOT NULL,          -- JSON array of { heading: string, body: string }
    lab_type TEXT CHECK(lab_type IN ('terminal', 'siem', 'hex_inspector', 'quiz')) NOT NULL,
    lab_briefing TEXT NOT NULL,
    lab_config_json TEXT NOT NULL,      -- JSON payload hydrating CLI, SIEM, Malware Inspector, or Quiz
    expected_flag TEXT NOT NULL,        -- Stripped from client responses; verified strictly on Cloudflare Worker
    hint TEXT NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- 3. Authenticated Student Profiles (Mapped from Cloudflare Access / Cf-Access-Authenticated-User-Email)
CREATE TABLE students (
    id TEXT PRIMARY KEY,                -- Student email or unique identity string
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Granular Per-Student Progress & Lab Telemetry
CREATE TABLE student_module_progress (
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
);

CREATE INDEX idx_modules_track ON modules(track_id);
CREATE INDEX idx_progress_student ON student_module_progress(student_id);
