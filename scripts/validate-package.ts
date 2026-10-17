/**
 * Phoenix Labs Academy — Research & Course Package Schema Validator CLI
 *
 * Supports:
 *   1. Single Module Markdown (.md / .mdx with YAML frontmatter)
 *   2. Single Module JSON (.json)
 *   3. Multi-Module Course Bundle JSON ({ track?: {...}, tracks?: [...], modules: [...] })
 *   4. Directory of Course Packages (validates all .md and .json files in directory)
 *
 * Usage:
 *   npx tsx scripts/validate-package.ts <path-to-file-or-directory>
 */

import fs from 'node:fs';
import path from 'node:path';
import jsYaml from 'js-yaml';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    type: 'single_module' | 'course_bundle' | 'directory';
    id?: string;
    title?: string;
    track_id?: string;
    lab_type?: string;
    module_count?: number;
    track_count?: number;
  };
}

export interface ParsedCourseData {
  tracks: any[];
  modules: any[];
  errors: string[];
  warnings: string[];
}

export function parseMarkdownModule(rawContent: string): { parsed?: any; error?: string; warning?: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    return {
      error: 'Markdown curriculum file is missing standard YAML frontmatter between --- delimiters.'
    };
  }

  try {
    const frontmatter = jsYaml.load(match[1]) as Record<string, any>;
    const bodyContent = match[2].trim();
    let warning: string | undefined;
    if (!bodyContent && (!frontmatter.theory_sections || frontmatter.theory_sections.length === 0)) {
      warning = 'Markdown body is empty. Theory sections will have no body text.';
    }

    const sections = bodyContent.split(/^##?\s+/m).filter(Boolean);
    const parsedSections = sections.map((sec) => {
      const nl = sec.indexOf('\n');
      return nl === -1
        ? { heading: sec.trim(), body: '' }
        : { heading: sec.slice(0, nl).trim(), body: sec.slice(nl + 1).trim() };
    });

    const parsed = {
      ...frontmatter,
      theory_sections:
        Array.isArray(frontmatter.theory_sections) && frontmatter.theory_sections.length > 0
          ? frontmatter.theory_sections
          : parsedSections.length > 0
          ? parsedSections
          : [{ heading: 'Theory', body: bodyContent }]
    };

    return { parsed, warning };
  } catch (err: any) {
    return { error: `YAML frontmatter syntax error: ${err.message}` };
  }
}

export function validateSingleModuleObject(
  parsed: any,
  prefix = ''
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = prefix ? `[${prefix}] ` : '';

  const mandatoryFields = ['id', 'track_id', 'slug', 'title', 'difficulty', 'lab_type', 'expected_flag'];
  for (const field of mandatoryFields) {
    if (!parsed || !parsed[field]) {
      errors.push(`${label}Missing mandatory field: "${field}"`);
    }
  }

  if (!parsed) return { errors, warnings };

  const validDifficulties = ['Fundamentals', 'Intermediate', 'Advanced'];
  if (parsed.difficulty && !validDifficulties.includes(parsed.difficulty)) {
    errors.push(
      `${label}Invalid difficulty "${parsed.difficulty}". Must be one of: ${validDifficulties.join(', ')}`
    );
  }

  const validLabTypes = ['terminal', 'siem', 'hex_inspector', 'quiz'];
  if (parsed.lab_type && !validLabTypes.includes(parsed.lab_type)) {
    errors.push(`${label}Invalid lab_type "${parsed.lab_type}". Must be one of: ${validLabTypes.join(', ')}`);
  }

  const cfg = parsed.lab_config || {};
  if (parsed.lab_type === 'terminal') {
    if (!cfg.commands && !cfg.quick_commands) {
      warnings.push(`${label}Terminal lab has neither "commands" nor "quick_commands" defined in lab_config.`);
    }
  } else if (parsed.lab_type === 'siem') {
    if (!Array.isArray(cfg.logs) || cfg.logs.length === 0) {
      warnings.push(`${label}SIEM lab has no "logs" array in lab_config.`);
    }
  } else if (parsed.lab_type === 'hex_inspector') {
    if (!cfg.sample_name) {
      warnings.push(`${label}Malware inspector lab missing "sample_name" in lab_config.`);
    }
    if (!cfg.imports && !cfg.strings && !cfg.sandbox_trace) {
      warnings.push(`${label}Malware inspector lab missing imports, strings, and sandbox_trace in lab_config.`);
    }
  } else if (parsed.lab_type === 'quiz') {
    if (!Array.isArray(cfg.questions) || cfg.questions.length === 0) {
      errors.push(`${label}Quiz lab must have a non-empty "questions" array in lab_config.`);
    } else {
      cfg.questions.forEach((q: any, i: number) => {
        if (!q.prompt || !Array.isArray(q.options) || typeof q.answerIndex !== 'number') {
          errors.push(
            `${label}Quiz question #${i + 1} is missing prompt, options array, or valid numeric answerIndex.`
          );
        }
      });
    }
  }

  return { errors, warnings };
}

export function extractCourseDataFromPath(targetPath: string): ParsedCourseData {
  const tracks: any[] = [];
  const modules: any[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(targetPath)) {
    return { tracks, modules, errors: [`Path not found: ${targetPath}`], warnings };
  }

  const stat = fs.statSync(targetPath);

  if (stat.isDirectory()) {
    const entries = fs
      .readdirSync(targetPath)
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return (ext === '.md' || ext === '.mdx' || ext === '.json') && !f.toLowerCase().startsWith('readme');
      })
      .sort();

    if (entries.length === 0) {
      errors.push(`No .md or .json curriculum files found in directory: ${targetPath}`);
      return { tracks, modules, errors, warnings };
    }

    for (const entry of entries) {
      const subResult = extractCourseDataFromPath(path.join(targetPath, entry));
      tracks.push(...subResult.tracks);
      modules.push(...subResult.modules);
      errors.push(...subResult.errors);
      warnings.push(...subResult.warnings);
    }

    return { tracks, modules, errors, warnings };
  }

  const rawContent = fs.readFileSync(targetPath, 'utf-8');
  const ext = path.extname(targetPath).toLowerCase();
  const baseName = path.basename(targetPath);

  if (ext === '.json') {
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err: any) {
      return { tracks, modules, errors: [`[${baseName}] JSON syntax error: ${err.message}`], warnings };
    }

    // Check if Course Bundle JSON ({ track?: ..., tracks?: [...], modules: [...] })
    if (Array.isArray(parsed.modules)) {
      if (parsed.track) tracks.push(parsed.track);
      if (Array.isArray(parsed.tracks)) tracks.push(...parsed.tracks);

      if (parsed.modules.length === 0) {
        errors.push(`[${baseName}] Course bundle "modules" array cannot be empty.`);
      }

      parsed.modules.forEach((mod: any, idx: number) => {
        const modLabel = `${baseName}#${mod.id || idx + 1}`;
        const v = validateSingleModuleObject(mod, modLabel);
        errors.push(...v.errors);
        warnings.push(...v.warnings);
        modules.push(mod);
      });
    } else {
      const v = validateSingleModuleObject(parsed, baseName);
      errors.push(...v.errors);
      warnings.push(...v.warnings);
      modules.push(parsed);
    }
  } else if (ext === '.md' || ext === '.mdx') {
    const { parsed, error, warning } = parseMarkdownModule(rawContent);
    if (error) {
      errors.push(`[${baseName}] ${error}`);
      return { tracks, modules, errors, warnings };
    }
    if (warning) {
      warnings.push(`[${baseName}] ${warning}`);
    }
    const v = validateSingleModuleObject(parsed, baseName);
    errors.push(...v.errors);
    warnings.push(...v.warnings);
    modules.push(parsed);
  } else {
    errors.push(`Unsupported file extension "${ext}" for ${baseName}. Use .json or .md`);
  }

  return { tracks, modules, errors, warnings };
}

export function validatePackageFile(targetPath: string): ValidationResult {
  const data = extractCourseDataFromPath(targetPath);
  const isDir = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory();

  if (data.modules.length === 1 && !isDir && data.tracks.length === 0) {
    const m = data.modules[0];
    return {
      valid: data.errors.length === 0,
      errors: data.errors,
      warnings: data.warnings,
      metadata: {
        type: 'single_module',
        id: m?.id,
        title: m?.title,
        track_id: m?.track_id,
        lab_type: m?.lab_type,
        module_count: 1,
        track_count: 0
      }
    };
  }

  return {
    valid: data.errors.length === 0,
    errors: data.errors,
    warnings: data.warnings,
    metadata: {
      type: isDir ? 'directory' : 'course_bundle',
      id: data.tracks[0]?.id || data.modules[0]?.track_id,
      title: data.tracks[0]?.title || `${data.modules.length} Curriculum Modules`,
      track_id: data.tracks[0]?.id || data.modules[0]?.track_id,
      module_count: data.modules.length,
      track_count: data.tracks.length
    }
  };
}

// Direct CLI Execution
const isMainScript = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('validate-package.ts');
const targetArg = process.argv[2];
if (isMainScript && targetArg) {
  console.log(`\n🔍 Validating curriculum target: ${targetArg}`);
  const result = validatePackageFile(path.resolve(process.cwd(), targetArg));

  if (result.valid) {
    console.log(`\x1b[32m✓ Package validation succeeded!\x1b[0m`);
    if (result.metadata?.type === 'single_module') {
      console.log(`  Type:     Single Module`);
      console.log(`  ID:       ${result.metadata?.id}`);
      console.log(`  Title:    ${result.metadata?.title}`);
      console.log(`  Track:    ${result.metadata?.track_id}`);
      console.log(`  Lab Type: ${result.metadata?.lab_type}`);
    } else {
      console.log(`  Type:     ${result.metadata?.type === 'directory' ? 'Course Directory' : 'Course Bundle'}`);
      console.log(`  Title:    ${result.metadata?.title}`);
      console.log(`  Tracks:   ${result.metadata?.track_count}`);
      console.log(`  Modules:  ${result.metadata?.module_count}`);
    }
    if (result.warnings.length > 0) {
      console.log(`\n\x1b[33m⚠️  Warnings:\x1b[0m`);
      result.warnings.forEach((w) => console.log(`  - ${w}`));
    }
    process.exit(0);
  } else {
    console.error(`\x1b[31m✗ Validation failed with ${result.errors.length} error(s):\x1b[0m`);
    result.errors.forEach((e) => console.error(`  - ${e}`));
    if (result.warnings.length > 0) {
      console.log(`\n\x1b[33m⚠️  Warnings:\x1b[0m`);
      result.warnings.forEach((w) => console.log(`  - ${w}`));
    }
    process.exit(1);
  }
}
