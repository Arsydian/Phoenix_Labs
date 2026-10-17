/**
 * Phoenix Labs Academy — Research Package Schema Validator CLI (Feature 1)
 * 
 * Usage:
 *   npx tsx scripts/validate-package.ts <path-to-package.json-or-package.md>
 */

import fs from 'node:fs';
import path from 'node:path';
import jsYaml from 'js-yaml';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

export function validatePackageFile(filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`], warnings };
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  let parsed: any;

  if (ext === '.json') {
    try {
      parsed = JSON.parse(rawContent);
    } catch (err: any) {
      return { valid: false, errors: [`JSON syntax error: ${err.message}`], warnings };
    }
  } else if (ext === '.md' || ext === '.mdx') {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);

    if (!match) {
      return {
        valid: false,
        errors: ['Markdown curriculum file is missing standard YAML frontmatter between --- delimiters.'],
        warnings
      };
    }

    try {
      parsed = jsYaml.load(match[1]) as Record<string, any>;
      const body = match[2].trim();
      if (!body) {
        warnings.push('Markdown body is empty. Theory sections will have no body text.');
      }
    } catch (err: any) {
      return { valid: false, errors: [`YAML frontmatter syntax error: ${err.message}`], warnings };
    }
  } else {
    return { valid: false, errors: [`Unsupported file extension "${ext}". Use .json or .md`], warnings };
  }

  // Mandatory fields check
  const mandatoryFields = ['id', 'track_id', 'slug', 'title', 'difficulty', 'lab_type', 'expected_flag'];
  for (const field of mandatoryFields) {
    if (!parsed[field]) {
      errors.push(`Missing mandatory field: "${field}"`);
    }
  }

  // Difficulty enum
  const validDifficulties = ['Fundamentals', 'Intermediate', 'Advanced'];
  if (parsed.difficulty && !validDifficulties.includes(parsed.difficulty)) {
    errors.push(`Invalid difficulty "${parsed.difficulty}". Must be one of: ${validDifficulties.join(', ')}`);
  }

  // Lab type enum
  const validLabTypes = ['terminal', 'siem', 'hex_inspector', 'quiz'];
  if (parsed.lab_type && !validLabTypes.includes(parsed.lab_type)) {
    errors.push(`Invalid lab_type "${parsed.lab_type}". Must be one of: ${validLabTypes.join(', ')}`);
  }

  // Lab-specific payload validation
  const cfg = parsed.lab_config || {};
  if (parsed.lab_type === 'terminal') {
    if (!cfg.commands && !cfg.quick_commands) {
      warnings.push('Terminal lab has neither "commands" nor "quick_commands" defined in lab_config.');
    }
  } else if (parsed.lab_type === 'siem') {
    if (!Array.isArray(cfg.logs) || cfg.logs.length === 0) {
      warnings.push('SIEM lab has no "logs" array in lab_config.');
    }
  } else if (parsed.lab_type === 'hex_inspector') {
    if (!cfg.sample_name) {
      warnings.push('Malware inspector lab missing "sample_name" in lab_config.');
    }
    if (!cfg.imports && !cfg.strings && !cfg.sandbox_trace) {
      warnings.push('Malware inspector lab missing imports, strings, and sandbox_trace in lab_config.');
    }
  } else if (parsed.lab_type === 'quiz') {
    if (!Array.isArray(cfg.questions) || cfg.questions.length === 0) {
      errors.push('Quiz lab must have a non-empty "questions" array in lab_config.');
    } else {
      cfg.questions.forEach((q: any, i: number) => {
        if (!q.prompt || !Array.isArray(q.options) || typeof q.answerIndex !== 'number') {
          errors.push(`Quiz question #${i + 1} is missing prompt, options array, or valid numeric answerIndex.`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      id: parsed.id,
      title: parsed.title,
      track_id: parsed.track_id,
      lab_type: parsed.lab_type
    }
  };
}

// Direct CLI Execution
const isMainScript = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('validate-package.ts');
const targetFile = process.argv[2];
if (isMainScript && targetFile) {
  console.log(`\n🔍 Validating curriculum package: ${targetFile}`);
  const result = validatePackageFile(path.resolve(process.cwd(), targetFile));

  if (result.valid) {
    console.log(`\x1b[32m✓ Package is valid!\x1b[0m`);
    console.log(`  ID: ${result.metadata?.id}`);
    console.log(`  Title: ${result.metadata?.title}`);
    console.log(`  Track: ${result.metadata?.track_id}`);
    console.log(`  Lab Type: ${result.metadata?.lab_type}`);
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
