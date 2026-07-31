/*
  Proves a deployed site actually redirects the way the map says it does.

  tests/redirects.test.mjs proves the map is internally consistent and
  tests/redirects.build.test.mjs proves the destinations were built. Neither of them
  talks to a server, so neither can catch a rule that Netlify parses differently from the
  way this repository reads it, a rule shadowed by an earlier one, or a destination that
  is itself a redirect. This does, because it asks the running site.

  The check that matters is one hop. Decision 19 forbids chains, and a chain is invisible
  to anything that only looks at the first response: /posts/x returning 301 looks correct
  right up until you follow it and land on another 301.

    node scripts/verify-deploy.mjs https://dev-mjolley-v2--sitename.netlify.app
    node scripts/verify-deploy.mjs https://baldbeardedbuilder.com --all

  Without --all it samples, because 150 rules times two requests against a cold branch
  deploy is slow and the sample catches structural breakage just as well. Use --all
  before merging.

  WHAT THIS CANNOT DO, AND IT MATTERS.

  It cannot prove the bbb.dev short links from a branch deploy. That rule matches on
  hostname, and bbb.dev resolves to the production deploy, so a branch deploy never sees
  a request for it and the rule is never exercised. Sending a Host header at the branch
  URL does not help: Netlify routes on that header, so the request lands on production.

  So the short links are verified against production instead, with --shortlinks, which is
  read only and safe to run at any time. Run it before the merge and again after. If the
  after run differs, the merge broke 1,627 links and the answer is to roll back rather
  than to debug forwards.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith('http'))?.replace(/\/$/, '');
const all = args.includes('--all');
const shortlinksOnly = args.includes('--shortlinks');

if (!base && !shortlinksOnly) {
  console.error('Usage: node scripts/verify-deploy.mjs <base-url> [--all] [--shortlinks]');
  process.exit(1);
}

/*
  A handful of short links, chosen to be ones that have been in circulation long enough
  that breaking them would be noticed. The rule is a wildcard, so proving the wildcard
  resolves proves the shape for all 1,627 of them. Proving each one individually would
  mean reading the shorturls table, which lives in a project this repo is not allowed to
  touch.
*/
const SHORTLINKS = ['gh', 'yt', 'twitch'];

const SHORTLINK_TARGET = /^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/redirect\?path=/;

function rules() {
  const lines = fs
    .readFileSync(path.join(ROOT, 'public', '_redirects'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const parsed = lines.map((l) => {
    const [from, to, code] = l.split(/\s+/);
    return { from, to, code: code ?? '301', wildcard: from.includes('*') };
  });

  const explicit = parsed.filter((r) => !r.wildcard);
  if (all) return { explicit, wildcards: parsed.filter((r) => r.wildcard) };

  /* Evenly spaced rather than the first N, so a sample covers the whole file. */
  const step = Math.max(1, Math.floor(explicit.length / 25));
  return {
    explicit: explicit.filter((_, i) => i % step === 0),
    wildcards: parsed.filter((r) => r.wildcard)
  };
}

async function hop(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const location = res.headers.get('location');
  return {
    status: res.status,
    location: location ? new URL(location, url).toString() : null
  };
}

const failures = [];

function fail(what, detail) {
  failures.push(`${what}\n      ${detail}`);
}

/** One request to confirm the redirect, one more to confirm it lands somewhere final. */
async function checkOneHop(from, expected) {
  const first = await hop(from);

  if (first.status !== 301) {
    fail(from, `expected 301, got ${first.status}`);
    return;
  }
  if (expected && first.location !== expected) {
    fail(from, `went to ${first.location}, expected ${expected}`);
    return;
  }

  const second = await hop(first.location);
  if (second.status >= 300 && second.status < 400) {
    fail(from, `chained: 301 to ${first.location}, which is another ${second.status} to ${second.location}`);
    return;
  }
  if (second.status !== 200) {
    fail(from, `landed on ${first.location} with ${second.status}`);
  }
}

async function inBatches(items, size, work) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(work));
  }
}

async function checkShortlinks() {
  console.log('short links, against production, read only');

  await inBatches(SHORTLINKS, 3, async (slug) => {
    const from = `https://bbb.dev/${slug}`;
    const res = await hop(from);

    if (res.status !== 301) {
      fail(from, `expected 301, got ${res.status}. 1,627 short links run through this rule`);
      return;
    }
    if (!SHORTLINK_TARGET.test(res.location ?? '')) {
      fail(from, `went to ${res.location}, which is not the redirect function`);
      return;
    }
    console.log(`  ok  /${slug} -> ${res.location}`);
  });
}

async function checkContent() {
  const { explicit, wildcards } = rules();
  console.log(`${explicit.length} explicit rules${all ? '' : ' sampled'} and ${wildcards.length} wildcards against ${base}`);

  await inBatches(explicit, 6, (r) => checkOneHop(base + r.from, base + r.to));

  /* A wildcard is a catch, so any slug that was never real proves it. */
  await inBatches(wildcards, 3, (r) => {
    const from = base + r.from.replace('*', 'nothing-has-ever-lived-here');
    const to = base + r.to.replace(':splat', 'nothing-has-ever-lived-here');
    return checkOneHop(from, r.to.includes(':splat') ? to : base + r.to);
  });

  if (!failures.length) console.log(`  ok  ${explicit.length + wildcards.length} rules, every one a single hop`);
}

if (shortlinksOnly) {
  await checkShortlinks();
} else {
  await checkContent();
  console.log('\nshort links not checked. They are host matched on bbb.dev, which never');
  console.log('reaches a branch deploy. Run with --shortlinks to check them on production.');
}

if (failures.length) {
  console.error(`\n${failures.length} redirect problems:\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}

console.log('\nredirects verified');
