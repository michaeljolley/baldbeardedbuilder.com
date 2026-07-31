/*
  Dev disaster invariants.

  The archive serves severity and sort views from the same path segment a disaster slug
  occupies, so a disaster called "newest" would shadow /dev-disasters/newest/. The submit
  API in phase five checks the same list before it accepts an AI written slug. This test
  guards the seed, and later the published rows.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

const seed = JSON.parse(read('../src/config/disasters.seed.json'));
const site = read('../src/config/site.ts');

/*
  site.ts is TypeScript, so a plain node test cannot import it. Each list is sliced out
  by its own declaration first, then scanned, so the two id patterns cannot cross over
  into each other.
*/
const block = (name) => {
  const m = site.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\n\\] as const;`));
  assert.ok(m, `${name} was not found in site.ts`);
  return m[1];
};

const severities = [...block('SEVERITIES').matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
const sorts = [...block('DISASTER_SORTS').matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
const reserved = new Set(['all', ...severities, ...sorts]);

test('the severity list parsed out of site.ts is the expected four', () => {
  assert.deepEqual(severities, ['error', 'warning', 'info', 'hint']);
});

test('the sort list parsed out of site.ts is the expected three', () => {
  assert.deepEqual(sorts, ['liked', 'replies', 'newest']);
});

test('no disaster slug shadows a severity, a sort or all', () => {
  for (const d of seed.disasters) {
    assert.ok(
      !reserved.has(d.slug),
      `Disaster ${d.id} has slug "${d.slug}", which the archive already uses as a view`
    );
  }
});

test('no two disasters share a slug or an id', () => {
  const slugs = new Set();
  const ids = new Set();
  for (const d of seed.disasters) {
    assert.ok(!slugs.has(d.slug), `Duplicate slug "${d.slug}"`);
    assert.ok(!ids.has(d.id), `Duplicate id ${d.id}`);
    slugs.add(d.slug);
    ids.add(d.id);
  }
});

test('every disaster carries a severity the site knows about', () => {
  for (const d of seed.disasters) {
    assert.ok(
      severities.includes(d.severity),
      `Disaster ${d.id} has severity "${d.severity}"`
    );
  }
});

test('every slug is lowercase, hyphen separated and URL safe', () => {
  for (const d of seed.disasters) {
    assert.match(d.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `Disaster ${d.id} slug "${d.slug}"`);
  }
});

test('every disaster has a line, a body and a real date', () => {
  for (const d of seed.disasters) {
    assert.ok(d.line && d.line.length > 0, `Disaster ${d.id} has no line`);
    assert.ok(Array.isArray(d.body) && d.body.length > 0, `Disaster ${d.id} has no body`);
    assert.ok(
      !Number.isNaN(new Date(d.published).getTime()),
      `Disaster ${d.id} has an unparseable published date`
    );
  }
});
