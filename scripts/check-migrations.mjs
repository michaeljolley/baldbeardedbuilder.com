/*
  Static check that the migration chain is self contained.

  There is no Docker on this machine and pushing to the legacy project is forbidden, so
  the chain cannot be applied anywhere to prove it works. This is the next best thing:
  every public.<name> a migration references must be created by an earlier migration in
  the chain, or be something Postgres or Supabase already provides.

  It exists because the baseline was trimmed from the full legacy schema down to two
  tables. If any v2 migration still leans on something that went, db push against the new
  project fails partway through, which is the worst place to find out.
*/

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations'
);

// Provided by the platform rather than by this repo.
const PROVIDED = new Set([
  'gen_random_uuid', 'now', 'count', 'coalesce', 'sum', 'min', 'max', 'lower', 'upper',
  'jsonb_typeof', 'to_jsonb', 'jsonb_build_object', 'array_agg', 'encode', 'digest',
  'setval', 'pg_get_serial_sequence', 'greatest', 'least', 'nullif', 'concat',
  'string_agg', 'row_number', 'date_trunc', 'extract', 'age', 'md5', 'trim', 'regexp_replace'
]);

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const created = new Set();
const problems = [];

/*
  Comments are stripped first. Every migration in this repo explains itself at length and
  those explanations name tables that were deliberately left behind, so scanning raw text
  reports the prose rather than the code.
*/
function strip(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

for (const file of files) {
  const sql = strip(fs.readFileSync(path.join(dir, file), 'utf8'));

  for (const m of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view|function|type)\s+(?:if\s+not\s+exists\s+)?public\.("?)([a-zA-Z_][a-zA-Z0-9_]*)\1/gi
  )) {
    created.add(m[2]);
  }

  for (const m of sql.matchAll(/public\.("?)([a-zA-Z_][a-zA-Z0-9_]*)\1/g)) {
    const name = m[2];
    if (created.has(name) || PROVIDED.has(name)) continue;
    problems.push(`${file}: references public.${name}, which nothing in the chain creates`);
    created.add(name);
  }
}

if (problems.length) {
  console.error('migration chain is not self contained:');
  for (const p of problems) console.error(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log(`migration chain is self contained across ${files.length} files, ${created.size} objects.`);
}
