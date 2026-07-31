/*
  The redirect map checked against a real build rather than against its own inputs.

  tests/redirects.test.mjs proves the map is internally consistent. This proves the
  destinations are pages that actually got built, which is the only version of the claim
  that matters to a visitor. It skips itself when dist is absent so the fast test run
  still works without a build.

  Run after: pnpm build
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const hasBuild = fs.existsSync(path.join(DIST, 'index.html'));

const rules = fs
  .readFileSync(path.join(ROOT, 'public', '_redirects'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [from, to] = l.split(/\s+/);
    return { from, to };
  })
  .filter((r) => !r.from.includes('*'));

function built(url) {
  const rel = url.replace(/^\//, '').replace(/\/$/, '');
  const file = rel === '' ? 'index.html' : path.join(rel, 'index.html');
  return fs.existsSync(path.join(DIST, file));
}

test('every redirect destination was actually built', { skip: !hasBuild && 'no dist, run pnpm build first' }, () => {
  const missing = [...new Set(rules.filter((r) => !built(r.to)).map((r) => r.to))];
  assert.deepEqual(
    missing,
    [],
    `${missing.length} destinations do not exist in dist:\n  ${missing.slice(0, 20).join('\n  ')}`
  );
});

test('every topic page was built', { skip: !hasBuild && 'no dist, run pnpm build first' }, () => {
  const taxonomy = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'config', 'taxonomy.json'), 'utf8')
  );
  const topics = [...new Set(Object.values(taxonomy.entries).map((e) => e.primaryTopic))];
  const missing = topics.filter((t) => !built(`/${t}/`));
  assert.deepEqual(missing, [], `topic index pages missing: ${missing.join(', ')}`);
});

test('every content item was built at its taxonomy URL', { skip: !hasBuild && 'no dist, run pnpm build first' }, () => {
  const taxonomy = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'config', 'taxonomy.json'), 'utf8')
  );
  const missing = Object.entries(taxonomy.entries)
    .filter(([, e]) => !built(e.url))
    .map(([k, e]) => `${k} -> ${e.url}`);
  assert.deepEqual(
    missing,
    [],
    `${missing.length} items not built:\n  ${missing.slice(0, 20).join('\n  ')}`
  );
});
