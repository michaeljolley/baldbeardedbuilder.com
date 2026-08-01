/*
  Every gate that reads dist has to name the tree it read.

  This exists because of two incidents rather than as a style rule. Both times a gate
  reported clean, both times the number was true about the dist in front of it, and both
  times that dist was not built from the branch anybody believed it was: once a stale
  build left behind by mutation testing, once a build made while somebody else's
  uncommitted experiment was sitting in three source files.

  Neither run said anything wrong. That is the problem. A summary that cannot name its
  own subject is unfalsifiable, and the failure is silent by construction, so the only
  thing that keeps the wiring in place is a test that fails when somebody removes it.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPTS = path.join(process.cwd(), 'scripts');

/*
  The list is written out rather than discovered, because discovery here would defeat the
  point. A rule of "every script that imports serve-dist" is satisfiable by not importing
  serve-dist, and a new gate that reads dist some other way would never be noticed.
*/
const DIST_READING_GATES = [
  'check-dist.mjs',
  'check-layout.mjs',
  'check-share.mjs',
  'check-aria.mjs',
  'check-emails.mjs',
  'check-headings.mjs',
  'a11y.mjs',
  'lighthouse.mjs',
];

for (const name of DIST_READING_GATES) {
  test(`${name} names the tree its dist came from`, () => {
    const src = fs.readFileSync(path.join(SCRIPTS, name), 'utf8');
    assert.match(
      src,
      /import \{ provenanceSuffix \} from '\.\/lib\/provenance\.mjs';/,
      `${name} reads dist but does not import provenanceSuffix.`,
    );
    assert.match(
      src,
      /provenanceSuffix\(\)/,
      `${name} imports provenanceSuffix but never calls it, so its summary still cannot say which tree it describes.`,
    );
  });
}

test('the build stamps dist after pagefind rather than before it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const postbuild = pkg.scripts.postbuild ?? '';
  assert.match(postbuild, /stamp-build\.mjs/, 'postbuild does not stamp the build.');

  /*
    Order is load bearing. Pagefind indexes everything in dist, so stamping first would
    put the branch name and sha of every build into the public search index.
  */
  assert.ok(
    postbuild.indexOf('pagefind') < postbuild.indexOf('stamp-build.mjs'),
    'the stamp runs before pagefind, which would index the sha and branch into site search.',
  );
});

test('the stamp records whether the tree was clean', () => {
  const src = fs.readFileSync(path.join(SCRIPTS, 'stamp-build.mjs'), 'utf8');

  /*
    The dirty flag is the whole reason the file exists. A sha alone would have been clean
    and reassuring in both incidents, because in both of them the sha was correct and the
    working tree was not.
  */
  assert.match(src, /git\('diff'/, 'the stamp never asks git whether the tree is dirty.');
  assert.match(src, /clean:/, 'the stamp does not record a clean flag.');
  assert.match(src, /dirtyFiles:/, 'the stamp records a clean flag but not which files made it dirty.');
});

test('a missing stamp says so instead of throwing', async () => {
  /*
    A gate refusing to run because it cannot describe itself would turn a reporting
    improvement into a new way for the suite to go red, which is how reporting
    improvements get deleted.
  */
  const { provenanceSuffix } = await import('../scripts/lib/provenance.mjs');
  const out = provenanceSuffix();
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0, 'provenanceSuffix returned nothing, so a summary would silently lose its subject.');
});
