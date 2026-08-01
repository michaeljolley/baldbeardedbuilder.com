/*
  The lead card on the front page always has something to say.

  The widest slot on the homepage holds a thumbnail, a two line title and a meta line. With
  no summary between them the card is mostly empty, and no layout change fixes that because
  the missing thing is words. Dropping aspect-ratio on the thumb was measured as an answer
  and it cuts 30.8 percent off the picture while leaving the summary gap at exactly the size
  it already was. See the .card.wide note in src/styles/app.css.

  So the rule is about content: the lead is the first Start here pick that has a summary,
  and a bare pick moves down the rail rather than putting a hole on the front page.

  Two of these read the built page rather than the source, because what matters is the
  paragraph a visitor sees, not the code that was supposed to produce it. They skip when
  dist is absent so a quick local run still works, and REQUIRE_DIST turns that skip into a
  failure on the CI step that follows the build. Four redirect tests once skipped on every
  CI run for their whole life while reporting green, which is the reason that flag exists.

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

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const starters = read(path.join('src', 'lib', 'starters.ts'));
const index = read(path.join('src', 'pages', 'index.astro'));

/* The wide card is the lead. Pull it out of the built markup and look inside it. */
function leadCard() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const open = html.indexOf('card wide');
  assert.notEqual(open, -1, 'no element with the card wide class was built on the homepage');
  const start = html.lastIndexOf('<', open);
  /*
    Cards are anchors and do not nest, so the next closing tag of the same kind ends it.
    Matching on </a> rather than counting depth keeps this readable and is safe here.
  */
  const end = html.indexOf('</a>', start);
  assert.notEqual(end, -1, 'the lead card never closed');
  return html.slice(start, end);
}

test('the lead card on the built homepage has a summary', { skip: !hasBuild }, () => {
  const card = leadCard();
  const p = card.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  assert.ok(p, 'the lead card drew no paragraph at all, so it is a title over a meta line');

  const words = p[1].replace(/<[^>]+>/g, '').trim();
  assert.ok(
    words.length > 40,
    `the lead card's summary is ${words.length} characters, which is not a summary. ` +
      'Add a blurb to the first Start here pick in src/config/site.ts.'
  );
});

test('the lead card still draws its thumbnail and its meta line', { skip: !hasBuild }, () => {
  const card = leadCard();
  assert.match(card, /<img/, 'the lead card lost its thumbnail');
  assert.match(card, /class="foot"/, 'the lead card lost its meta line');
});

test('the lead is chosen by having prose, not by being first', () => {
  assert.match(
    starters,
    /findIndex\(hasSummary\)/,
    'starterItems no longer picks the lead by looking for a summary, so a bare first ' +
      'pick would go straight into the wide card'
  );
  assert.match(
    starters,
    /resolved\.unshift\(lead\)/,
    'the chosen lead is no longer moved to the front of the rail'
  );
});

test('a rail with nothing to say fails the build rather than drawing a hole', () => {
  assert.match(
    starters,
    /if \(leadIndex === -1\)[\s\S]{0,80}throw new Error/,
    'starterItems no longer throws when no pick has a summary. Returning the picks ' +
      'unchanged would put an empty card in the widest slot on the site.'
  );
});

test('an authored line wins over whatever the collection supplied', () => {
  assert.match(
    starters,
    /picks\[n\]\.blurb \?\? item\.description/,
    'the blurb is no longer preferred over the item description'
  );
});

test('the homepage resolves the rail through starterItems', () => {
  assert.match(
    index,
    /starters = await starterItems\(\)/,
    'index.astro no longer calls starterItems, so the lead rule is not applied'
  );
  assert.doesNotMatch(
    index,
    /START_HERE\[\s*n\s*\]/,
    'index.astro is mapping blurbs by array position again, which bypasses the lead rule'
  );
});
