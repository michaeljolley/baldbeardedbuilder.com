/*
  Two halves, and neither one covers the other.

  The unit half runs the transform over hand built trees, so it can state what happens to
  a body that no article currently contains: alternating h1 and h2 sections, a heading at
  h6, a heading nested inside other elements. Those are the cases that decide whether the
  rule is right, and none of them are in the catalogue today.

  The dist half asserts the outcome on real pages. It is safe under decision 117 in the
  direction that matters: a content edit that adds an h1 cannot turn it red, because the
  plugin removes the h1. It goes red when the plugin stops running, which is the only
  thing it is watching for.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rehypeDemoteHeadings } from '../src/lib/rehype-demote-headings.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');

/** @param {string} tagName @param {any[]} [children] */
const el = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children });
/** @param {string} value */
const text = (value) => ({ type: 'text', value });

/** @param {any} tree */
function tags(tree) {
  /** @type {string[]} */
  const out = [];
  const walk = (/** @type {any} */ node) => {
    if (node?.type === 'element' && /^h[1-6]$/.test(node.tagName)) out.push(node.tagName);
    for (const child of node?.children ?? []) walk(child);
  };
  walk(tree);
  return out;
}

test('a body with no h1 is left exactly as it was', () => {
  const tree = { type: 'root', children: [el('h2'), el('h3'), el('p'), el('h2')] };
  rehypeDemoteHeadings()(tree);
  assert.deepEqual(tags(tree), ['h2', 'h3', 'h2']);
});

test('a body that opens with its own title shifts every level, not just the h1', () => {
  const tree = { type: 'root', children: [el('h1'), el('h2'), el('h3'), el('h2')] };
  rehypeDemoteHeadings()(tree);
  assert.deepEqual(tags(tree), ['h2', 'h3', 'h4', 'h3']);
});

test('h1 sections and h2 subsections stay two distinct levels', () => {
  /*
    This is the case that rules out renaming h1 to h2 on its own. That version returns
    h2 h2 h2 h2 here, and the subsections are gone with nothing reporting it.
  */
  const tree = { type: 'root', children: [el('h1'), el('h2'), el('h1'), el('h2')] };
  rehypeDemoteHeadings()(tree);
  assert.deepEqual(tags(tree), ['h2', 'h3', 'h2', 'h3']);
});

test('h6 clamps rather than becoming a tag that does not exist', () => {
  const tree = { type: 'root', children: [el('h1'), el('h6')] };
  rehypeDemoteHeadings()(tree);
  assert.deepEqual(tags(tree), ['h2', 'h6']);
});

test('a heading nested inside other elements is found', () => {
  const tree = { type: 'root', children: [el('h1'), el('blockquote', [el('div', [el('h3')])])] };
  rehypeDemoteHeadings()(tree);
  assert.deepEqual(tags(tree), ['h2', 'h4']);
});

test('the heading keeps its children and its attributes', () => {
  const heading = el('h1', [text('Sealed in C#')]);
  heading.properties = { id: 'sealed' };
  const tree = { type: 'root', children: [heading] };
  rehypeDemoteHeadings()(tree);
  assert.equal(heading.tagName, 'h2');
  assert.deepEqual(heading.properties, { id: 'sealed' });
  assert.equal(heading.children[0].value, 'Sealed in C#');
});

/** @param {string} dir @param {string[]} out */
function htmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const hasDist = fs.existsSync(dist);
if (!hasDist && process.env.REQUIRE_DIST) {
  throw new Error('REQUIRE_DIST is set and dist is missing. Run the build before the tests.');
}

test('no built page draws a heading above h2 inside prose', { skip: !hasDist }, () => {
  /** @type {string[]} */
  const offenders = [];
  for (const file of htmlFiles(dist)) {
    const raw = fs.readFileSync(file, 'utf8');
    for (const block of raw.matchAll(/<div class="prose"[\s\S]*?<\/div>/g)) {
      if (/<h1[\s>]/.test(block[0])) offenders.push(path.relative(dist, file));
    }
  }
  assert.deepEqual(offenders, [], `prose h1 on: ${offenders.join(', ')}`);
});

test('no built page carries two h1 elements', { skip: !hasDist }, () => {
  /*
    One page is exempt and it is exempt for a reason that cannot be derived from its
    markup. /kitchen-sink/ is the design system proof page: it is noindex, it is out of the
    sitemap, and its whole job is to draw every primitive exactly as production draws it,
    including the story head, which is an h1 because a story page's title is an h1. Giving
    the sample a different tag would mean the proof page no longer proves the thing it
    exists for, since .storyhead h1 is the selector that styles it.

    The exemption is a claim rather than a hole. The page has to still be there and still
    have exactly the two, so deleting it or growing a third turns this red rather than
    passing quietly on an exclusion nobody has read in a year.
  */
  const exempt = path.join('kitchen-sink', 'index.html');
  /** @type {string[]} */
  const offenders = [];
  let pages = 0;
  let exemptCount = -1;
  for (const file of htmlFiles(dist)) {
    pages += 1;
    const rel = path.relative(dist, file);
    const count = [...fs.readFileSync(file, 'utf8').matchAll(/<h1[\s>]/g)].length;
    if (rel === exempt) exemptCount = count;
    else if (count > 1) offenders.push(`${rel} has ${count}`);
  }
  assert.ok(pages > 0, 'found no built pages to read');
  assert.deepEqual(offenders, [], offenders.join(', '));
  assert.equal(exemptCount, 2, `${exempt} is exempt for two h1 and now has ${exemptCount}`);
});
