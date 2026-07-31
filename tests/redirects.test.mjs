/*
  Decision 19 as a test.

  Every old URL 301s exactly once, straight to a page that exists. The value here is not
  that the generator ran, it is that the destination is real and that nobody added a
  second hop by hand later.

  This runs against public/_redirects and against the set of pages the taxonomy says will
  exist. It deliberately does not need a build, so it can fail fast in CI before the
  slower build and axe stages.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const taxonomy = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'config', 'taxonomy.json'), 'utf8')
);
const raw = fs.readFileSync(path.join(ROOT, 'public', '_redirects'), 'utf8');

const parsed = raw
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [from, to, status] = l.split(/\s+/);
    return { from, to, status };
  });

const explicit = parsed.filter((r) => !r.from.includes('*'));
const wildcards = parsed.filter((r) => r.from.includes('*'));

/** Pages v2 serves. Anything a redirect points at has to be in here. */
const pages = new Set([
  '/',
  '/about/',
  '/conduct/',
  '/dev-disasters/',
  '/privacy/',
  '/report/',
  '/search/',
  '/submit/',
  '/terms/',
  '/uses/',
  '/videos/',
  /*
    Articles only.

    A video's taxonomy url is where its page would be, not where a page is. A video page
    only exists when there is a video_pages row for it, per decision 22 and amendment 47,
    and this test cannot see the database. So a redirect pointing at a video url is a
    redirect that might land on a 404 depending on what somebody has written this week,
    which is not a redirect anybody should be allowed to write. Sending it to YouTube or
    to the topic feed is the answer, and the test below is what enforces that.
  */
  ...Object.entries(taxonomy.entries)
    .filter(([key]) => key.startsWith('blog:'))
    .map(([, e]) => e.url)
]);

test('every redirect has a source, a destination and a 301', () => {
  assert.ok(parsed.length > 100, `expected a full map, found ${parsed.length} rules`);
  for (const r of parsed) {
    assert.ok(r.from?.startsWith('/'), `bad source: ${JSON.stringify(r)}`);
    assert.ok(r.to?.startsWith('/'), `bad destination: ${JSON.stringify(r)}`);
    assert.equal(r.status, '301!', `${r.from} is not a forced 301`);
  }
});

test('no source appears twice', () => {
  const seen = new Set();
  const dupes = [];
  for (const r of parsed) {
    if (seen.has(r.from)) dupes.push(r.from);
    seen.add(r.from);
  }
  assert.deepEqual(dupes, [], `duplicate sources: ${dupes.join(', ')}`);
});

test('every destination is a page that exists', () => {
  const missing = explicit.filter((r) => !pages.has(r.to)).map((r) => `${r.from} -> ${r.to}`);
  assert.deepEqual(missing, [], `destinations that are not real pages:\n  ${missing.join('\n  ')}`);
});

test('no redirect points at a video page, which may not exist', () => {
  const videoUrls = new Set(
    Object.entries(taxonomy.entries)
      .filter(([key]) => key.startsWith('videos:'))
      .map(([, e]) => e.url)
  );
  const risky = explicit.filter((r) => videoUrls.has(r.to)).map((r) => `${r.from} -> ${r.to}`);
  assert.deepEqual(risky, [], `redirects to conditional video pages:\n  ${risky.join('\n  ')}`);
});

test('no redirect chains, a destination is never also a source', () => {
  const sources = new Set(explicit.map((r) => r.from));
  const chained = explicit
    .filter((r) => sources.has(r.to))
    .map((r) => `${r.from} -> ${r.to} -> ${explicit.find((x) => x.from === r.to)?.to}`);
  assert.deepEqual(chained, [], `chains found:\n  ${chained.join('\n  ')}`);
});

test('every destination carries a trailing slash, since the site is trailingSlash always', () => {
  const bare = explicit.filter((r) => !r.to.endsWith('/')).map((r) => r.to);
  assert.deepEqual(bare, [], `destinations missing a trailing slash: ${bare.join(', ')}`);
});

test('wildcards sit last so they can never shadow a specific rule', () => {
  const firstWildcardAt = parsed.findIndex((r) => r.from.includes('*'));
  const lastExplicitAt = parsed.map((r) => r.from.includes('*')).lastIndexOf(false);
  assert.ok(
    firstWildcardAt > lastExplicitAt,
    'a wildcard rule appears before an explicit rule and would shadow it'
  );
  assert.equal(wildcards.length, 2, 'only /brain-dump/* and /posts/* should be wildcards');
});

test('every article has a redirect from its old blog URL', () => {
  const sources = new Set(explicit.map((r) => r.from));
  const missing = Object.keys(taxonomy.entries)
    .filter((k) => k.startsWith('blog:'))
    .map((k) => `/blog/${k.slice(5)}/`)
    .filter((u) => !sources.has(u));
  assert.deepEqual(missing, [], `articles with no redirect:\n  ${missing.join('\n  ')}`);
});

test('the legacy posts aliases measured on production are all still covered', () => {
  // Sampled from a live probe. If any of these stops redirecting, an inbound link that
  // works today starts 404ing.
  const live = [
    '/posts/stream-setup',
    '/posts/code-of-conduct-and-contributions-in-public-repositories',
    '/posts/using-automapper-with-dotnetcore-3',
    '/posts/adding-hateoas-to-an-aspnetcore-rest-api'
  ];
  const sources = new Set(explicit.map((r) => r.from));
  const missing = live.filter((u) => !sources.has(u));
  assert.deepEqual(missing, [], `live redirects that would break: ${missing.join(', ')}`);
});

test('no taxonomy URL collides with a reserved top level path', () => {
  const reserved = new Set([
    '404', 'about', 'blog', 'builders', 'conduct', 'dev-disasters', 'images',
    'kitchen-sink', 'privacy', 'report', 'rss.xml', 'search', 'settings',
    'sitemap-index.xml', 'submit', 'terms', 'uses', 'videos'
  ]);
  const clashes = Object.values(taxonomy.entries)
    .map((e) => e.url.split('/')[1])
    .filter((seg) => reserved.has(seg));
  assert.deepEqual([...new Set(clashes)], [], 'a topic shadows a reserved path');
});

test('no two items resolve to the same URL', () => {
  const seen = new Map();
  const dupes = [];
  for (const [key, e] of Object.entries(taxonomy.entries)) {
    if (seen.has(e.url)) dupes.push(`${e.url}: ${key} and ${seen.get(e.url)}`);
    seen.set(e.url, key);
  }
  assert.deepEqual(dupes, [], `duplicate URLs:\n  ${dupes.join('\n  ')}`);
});
