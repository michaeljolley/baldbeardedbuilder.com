/*
  The redirect map checked against a real build rather than against its own inputs.

  tests/redirects.test.mjs proves the map is internally consistent. This proves the
  destinations are pages that actually got built, which is the only version of the claim
  that matters to a visitor.

  It skips itself when dist is absent so the fast local test run still works without a
  build. That convenience quietly cost the whole file: CI ran pnpm test before pnpm build,
  so dist was never there and all four tests skipped on every single run. Green, reported
  as passing, and asserting nothing. The exhaustive redirect check the plan calls for had
  never once executed in the pipeline.

  REQUIRE_DIST is how that stays fixed. CI sets it on the test step that follows the
  build, and there a missing dist is a workflow ordering bug rather than somebody running
  tests quickly at their desk, so it fails loudly instead of printing a skip nobody reads.

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

if (!hasBuild && process.env.REQUIRE_DIST) {
  throw new Error(
    'REQUIRE_DIST is set but dist is missing, so these tests would silently skip. ' +
      'This step is meant to run after pnpm build.'
  );
}

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

test('every article was built at its taxonomy URL', { skip: !hasBuild && 'no dist, run pnpm build first' }, () => {
  const taxonomy = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'config', 'taxonomy.json'), 'utf8')
  );
  /*
    Articles only. A video's taxonomy url is where its page goes if it ever gets one, and
    it only gets one when there is a video_pages row, per decision 22 and amendment 47. On
    a build with no database there are none, and that is the shipping configuration rather
    than a failure. The test below is the one that keeps videos honest.
  */
  const missing = Object.entries(taxonomy.entries)
    .filter(([key]) => key.startsWith('blog:'))
    .filter(([, e]) => !built(e.url))
    .map(([k, e]) => `${k} -> ${e.url}`);
  assert.deepEqual(
    missing,
    [],
    `${missing.length} items not built:\n  ${missing.slice(0, 20).join('\n  ')}`
  );
});

/*
  A video page exists or it does not, and either is fine. What is not fine is a page that
  exists and says nothing, which is what the site shipped before: every video had a page
  and every page apologised for having no transcript. So this asserts the only property
  that matters, which is that nothing links to a video page that was not built.
*/
test('nothing links to a video page that was not built', { skip: !hasBuild && 'no dist, run pnpm build first' }, () => {
  const taxonomy = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'config', 'taxonomy.json'), 'utf8')
  );
  const unbuilt = new Set(
    Object.entries(taxonomy.entries)
      .filter(([key]) => key.startsWith('videos:'))
      .map(([, e]) => e.url)
      .filter((url) => !built(url))
  );

  const html = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) html.push(full);
    }
  };
  walk(DIST);

  const offenders = [];
  for (const file of html) {
    const body = fs.readFileSync(file, 'utf8');
    for (const url of unbuilt) {
      if (body.includes(`href="${url}"`)) {
        offenders.push(`${path.relative(DIST, file)} links to ${url}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `${offenders.length} links to video pages that do not exist:\n  ${offenders.slice(0, 20).join('\n  ')}`
  );
});
