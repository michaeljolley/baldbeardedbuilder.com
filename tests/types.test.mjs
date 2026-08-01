/*
  The type surface may not promise more than the applied migration chain delivers.

  This exists because it nearly did. pending.types.ts declared unsubscribe_by_token under
  Functions while the migration that creates it sat parked in supabase/deferred/. A typed
  .rpc('unsubscribe_by_token') call would have compiled cleanly and failed at runtime,
  with nothing in between to catch it. The types file is hand written precisely because it
  cannot be generated yet, which is exactly when this drift is possible.

  The same shape as a preference for an email that never sends, one layer down: a surface
  that is correct about a schema nobody is going to have.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = path.join(ROOT, 'src', 'lib', 'supabase', 'pending.types.ts');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');

function appliedSql() {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'))
    .join('\n');
}

/*
  Reads one interface body out of the file by brace matching from its opening line, so a
  nested block cannot end the scan early.
*/
function interfaceBody(src, name) {
  const start = src.indexOf(`export interface ${name}`);
  assert.notEqual(start, -1, `${name} is gone from pending.types.ts`);
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(from, i + 1);
  }
  throw new Error(`unbalanced braces in ${name}`);
}

/* Every key at the top level of a Functions block, ignoring anything inside comments. */
function functionNames(body) {
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const block = stripped.match(/Functions:\s*\{([\s\S]*?)\n {4}\};/);
  if (!block) return [];
  return [...block[1].matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]);
}

test('PendingDatabase declares no function the applied chain does not create', () => {
  const src = fs.readFileSync(TYPES, 'utf8');
  const declared = functionNames(interfaceBody(src, 'PendingDatabase'));
  const sql = appliedSql();

  const missing = declared.filter(
    (fn) => !new RegExp(`create\\s+(or\\s+replace\\s+)?function\\s+(public\\.)?${fn}\\b`, 'i').test(sql)
  );

  assert.deepEqual(
    missing,
    [],
    `pending.types.ts promises .rpc() can call ${missing.join(', ')}, but no migration in ` +
      `the applied chain creates it. Either add the migration or move the declaration to ` +
      `DeferredDatabase.`
  );
});

test('the deferred function is declared, and only on DeferredDatabase', () => {
  const src = fs.readFileSync(TYPES, 'utf8');

  assert.ok(
    !functionNames(interfaceBody(src, 'PendingDatabase')).includes('unsubscribe_by_token'),
    'unsubscribe_by_token is back on PendingDatabase. Its migration is still parked.'
  );

  const deferred = fs.readFileSync(
    path.join(ROOT, 'supabase', 'deferred', '20260801000100_notifications.sql'),
    'utf8'
  );
  assert.match(
    deferred,
    /create\s+(or\s+replace\s+)?function\s+public\.unsubscribe_by_token/i,
    'the deferred migration no longer creates unsubscribe_by_token, so DeferredDatabase is lying too'
  );
});

test('nothing outside _unwired reaches for DeferredDatabase', () => {
  /*
    DeferredDatabase describes a schema the site does not have. A live page typed against
    it would compile and then fail against the real database, which is the whole failure
    this file exists to stop.
  */
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '_unwired') continue;
        walk(full);
      } else if (/\.(ts|astro|tsx)$/.test(entry.name) && full !== TYPES) {
        if (fs.readFileSync(full, 'utf8').includes('DeferredDatabase')) {
          offenders.push(path.relative(ROOT, full));
        }
      }
    }
  };
  walk(path.join(ROOT, 'src'));

  assert.deepEqual(offenders, [], `\n${offenders.join('\n')}\n`);
});
