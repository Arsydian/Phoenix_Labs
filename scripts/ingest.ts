/**
 * Phoenix Labs Academy — CLI Curriculum Package & Course Bundle Ingestion Tool
 *
 * Supports:
 *   - Single Module Markdown (.md with YAML frontmatter)
 *   - Single Module JSON (.json)
 *   - Multi-Module Course Bundle JSON ({ track?: {...}, tracks?: [...], modules: [...] })
 *   - Directory of Course Packages (.md / .json files)
 *
 * Usage:
 *   npx tsx scripts/ingest.ts <path-to-file-or-directory> [--remote] [--replace-track]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { extractCourseDataFromPath } from './validate-package';

const filePath = process.argv[2];
const isRemote = process.argv.includes('--remote');
const replaceTrack = process.argv.includes('--replace-track');

if (!filePath) {
  console.log(`
Usage:
  npx tsx scripts/ingest.ts <path-to-package-or-directory> [--remote] [--replace-track]

Options:
  --remote         Commits to production Cloudflare D1 (defaults to --local)
  --replace-track  Clears existing modules in the target track(s) before inserting
`);
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), filePath);
console.log(`\n📦 Reading curriculum target: ${resolvedPath}`);

const courseData = extractCourseDataFromPath(resolvedPath);
if (courseData.errors.length > 0) {
  console.error('\x1b[31m✗ Package validation failed:\x1b[0m');
  courseData.errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

const escapeSql = (str: string) => String(str ?? '').replace(/'/g, "''");
const sqlStatements: string[] = [];

// 1. Optional Track Upserts
const uniqueTracks = new Map<string, any>();
for (const trk of courseData.tracks) {
  if (trk && trk.id) uniqueTracks.set(trk.id, trk);
}

for (const trk of uniqueTracks.values()) {
  sqlStatements.push(
    `INSERT OR REPLACE INTO tracks (id, slug, title, subtitle, description, order_index) VALUES (
  '${escapeSql(trk.id)}',
  '${escapeSql(trk.slug || trk.id)}',
  '${escapeSql(trk.title)}',
  '${escapeSql(trk.subtitle || '')}',
  '${escapeSql(trk.description || '')}',
  ${Number(trk.order_index) || 1}
);`
  );
}

// 2. Optional Track Module Cleanup (when --replace-track is passed)
if (replaceTrack) {
  const trackIds = new Set<string>([
    ...Array.from(uniqueTracks.keys()),
    ...courseData.modules.map((m) => m.track_id).filter(Boolean)
  ]);
  for (const tId of trackIds) {
    sqlStatements.push(`DELETE FROM modules WHERE track_id = '${escapeSql(tId)}';`);
  }
}

// 3. Module Upserts
for (const parsed of courseData.modules) {
  const theoryJson = JSON.stringify(parsed.theory_sections || []);
  const labConfigJson = JSON.stringify(parsed.lab_config || {});

  sqlStatements.push(
    `INSERT OR REPLACE INTO modules (
  id, track_id, slug, title, difficulty, order_index, estimated_minutes,
  theory_json, lab_type, lab_briefing, lab_config_json, expected_flag, hint
) VALUES (
  '${escapeSql(parsed.id)}',
  '${escapeSql(parsed.track_id)}',
  '${escapeSql(parsed.slug)}',
  '${escapeSql(parsed.title)}',
  '${escapeSql(parsed.difficulty)}',
  ${Number(parsed.order_index) || 10},
  ${Number(parsed.estimated_minutes) || 20},
  '${escapeSql(theoryJson)}',
  '${escapeSql(parsed.lab_type)}',
  '${escapeSql(parsed.lab_briefing || '')}',
  '${escapeSql(labConfigJson)}',
  '${escapeSql(parsed.expected_flag)}',
  '${escapeSql(parsed.hint || '')}'
);`
  );
}

const tempSqlPath = path.resolve(process.cwd(), '.temp_ingest.sql');
fs.writeFileSync(tempSqlPath, sqlStatements.join('\n\n'), 'utf-8');

try {
  const targetEnv = isRemote ? '--remote' : '--local';
  console.log(
    `🚀 Executing D1 ingestion (${targetEnv}) for ${uniqueTracks.size} track(s) and ${courseData.modules.length} module(s)...`
  );

  const cmd = `npx wrangler d1 execute secops-db ${targetEnv} --file="${tempSqlPath}"`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  console.log(output);

  console.log(
    `\x1b[32m✓ Successfully ingested ${courseData.modules.length} module(s) into Cloudflare D1!\x1b[0m\n`
  );
} catch (err: any) {
  console.error('\x1b[31m✗ Ingestion execution error:\x1b[0m', err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempSqlPath)) {
    fs.unlinkSync(tempSqlPath);
  }
}
