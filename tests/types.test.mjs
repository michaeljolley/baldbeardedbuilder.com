/*
  The generated type surface may not promise more than the applied migration chain delivers.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = path.join(ROOT, 'src', 'lib', 'supabase', 'database.types.ts');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');

function appliedSql() {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'))
    .join('\n');
}

/*
  Reads one generated type block by brace matching from its opening line, so a
  nested block cannot end the scan early.
*/
function blockBody(src, marker) {
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, `${marker} is gone from database.types.ts`);
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(from, i + 1);
  }
  throw new Error(`unbalanced braces after ${marker}`);
}

/* Every key at the top level of a Functions block, ignoring anything inside comments. */
function functionNames(src) {
  return [...blockBody(src, '    Functions: {').matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]);
}

test('generated Database declares no function the applied chain does not create', () => {
  const src = fs.readFileSync(TYPES, 'utf8');
  const declared = functionNames(src);
  const sql = appliedSql();

  const missing = declared.filter(
    (fn) => !new RegExp(`create\\s+(or\\s+replace\\s+)?function\\s+(public\\.)?${fn}\\b`, 'i').test(sql)
  );

  assert.deepEqual(
    missing,
    [],
    `database.types.ts promises .rpc() can call ${missing.join(', ')}, but no migration in ` +
      'the applied chain creates it.'
  );
});

test('notification functions are declared on generated Database', () => {
  const src = fs.readFileSync(TYPES, 'utf8');
  const names = functionNames(src);
  assert.ok(names.includes('claim_email_batch'));
  assert.ok(names.includes('unsubscribe_by_token'));
});
