/**
 * Phoenix Labs Academy — CLI Curriculum Package Ingestion Tool
 * 
 * Supports both JSON payloads and Markdown files with YAML frontmatter.
 * Validates package integrity, generates D1 SQL statements, and commits
 * to local SQLite or Cloudflare D1 via Wrangler.
 * 
 * Usage:
 *   npx tsx scripts/ingest.ts <path-to-file.json-or-file.md> [--remote]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import jsYaml from 'js-yaml';
import { validatePackageFile } from './validate-package';

const filePath = process.argv[2];
const isRemote = process.argv.includes('--remote');

if (!filePath) {
  console.log(`
Usage:
  npx tsx scripts/ingest.ts <path-to-package.json-or-package.md> [--remote]

Options:
  --remote    Commits to production Cloudflare D1 (defaults to --local)
`);
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), filePath);
console.log(`\n📦 Reading package file: ${resolvedPath}`);

// 1. Run Schema Validation
const validation = validatePackageFile(resolvedPath);
if (!validation.valid) {
  console.error('\x1b[31m✗ Package validation failed:\x1b[0m');
  validation.errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

// 2. Parse File Contents
const raw = fs.readFileSync(resolvedPath, 'utf-8');
const ext = path.extname(resolvedPath).toLowerCase();
let parsed: any;

if (ext === '.json') {
  parsed = JSON.parse(raw);
} else {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('Markdown missing YAML frontmatter.');
  const frontmatter = jsYaml.load(match[1]) as Record<string, any>;
  const bodyContent = match[2].trim();

  const sections = bodyContent.split(/^##?\s+/m).filter(Boolean);
  const theory_sections = sections.map((sec) => {
    const nl = sec.indexOf('\n');
    return nl === -1
      ? { heading: sec.trim(), body: '' }
      : { heading: sec.slice(0, nl).trim(), body: sec.slice(nl + 1).trim() };
  });

  parsed = {
    ...frontmatter,
    theory_sections: theory_sections.length > 0 ? theory_sections : [{ heading: 'Theory', body: bodyContent }]
  };
}

// 3. Format SQL Parameters
const theoryJson = JSON.stringify(parsed.theory_sections || []);
const labConfigJson = JSON.stringify(parsed.lab_config || {});
const escapeSql = (str: string) => (str || '').replace(/'/g, "''");

const sql = `
INSERT OR REPLACE INTO modules (
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
);
`.trim();

// Write temporary SQL file for wrangler execution
const tempSqlPath = path.resolve(process.cwd(), '.temp_ingest.sql');
fs.writeFileSync(tempSqlPath, sql, 'utf-8');

try {
  const targetEnv = isRemote ? '--remote' : '--local';
  console.log(`🚀 Executing D1 ingestion (${targetEnv})...`);

  const cmd = `npx wrangler d1 execute secops-db ${targetEnv} --file="${tempSqlPath}"`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  console.log(output);

  console.log(`\x1b[32m✓ Successfully ingested module: ${parsed.title} (${parsed.id})\x1b[0m\n`);
} catch (err: any) {
  console.error('\x1b[31m✗ Ingestion execution error:\x1b[0m', err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempSqlPath)) {
    fs.unlinkSync(tempSqlPath);
  }
}
