/*
  Redirect map generator.

  Decision 19 requires every old URL to 301 straight to its final destination with no
  chains. That rules out the wildcard approach the site runs today, because
  /posts/* to /blog/:splat lands on a URL without a trailing slash which then redirects
  again, and because /blog/[slug]/ is itself about to become an old URL once topic first
  routing lands.

  So every content URL gets an explicit line. Wildcards survive only as a final safety
  net for paths that were never real pages.

  Sources, in the order they are applied:
    1. LEGACY_ALIASES below, the pre Astro /posts/ URLs. Hand maintained because there is
       no machine readable record of them anywhere.
    2. taxonomy.json, which knows the final URL of every article and video.
    3. Index and pagination routes that no longer exist in v2.

  Run: pnpm redirects
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAXONOMY = path.join(ROOT, 'src', 'config', 'taxonomy.json');
const OUT = path.join(ROOT, 'public', '_redirects');

/**
 * Old Gridsome era URLs, mapped to the content id they became. Resolving the id through
 * taxonomy.json rather than hard coding a destination is what keeps these from chaining
 * the day a post changes topic.
 *
 * Measured against production on the day this was written. Every one of these currently
 * 301s, so removing one is a regression.
 */
const LEGACY_ALIASES = {
  '/posts/adding-hateoas-to-an-aspnetcore-rest-api': 'blog:adding-hateoas-to-an-asp-net-core-api',
  '/posts/using-automapper-with-dotnetcore-3': 'blog:using-auto-mapper-with-asp-net-core-3',
  '/posts/release-notes-with-github-appveyor-octopus-deploy':
    'blog:automating-release-notes-with-git-hub-app-veyor-and-octopus-deploy',
  '/posts/using-azure-key-vault-with-azure-functions':
    'blog:environment-variables-in-azure-functions-with-key-vault',
  '/posts/sql-server-in-a-linux-container-to-do-quick-tasks':
    'blog:using-sql-server-in-docker-containers-for-basic-tasks',
  // Production sends this one to a slug that does not exist and returns a 404. Pointing
  // it at the post that actually carries the content fixes a live broken link.
  '/posts/code-of-conduct-and-contributions-in-public-repositories':
    'blog:code-of-conduct-and-contributions-in-public-repositories',
  '/posts/setup-command-aliases-in-powershell-to-make-life-easier':
    'blog:adding-command-aliases-to-power-shell',
  '/posts/stream-setup': 'blog:current-twitch-live-coding-stream-setup',
  '/posts/docker-communication-between-containers':
    'blog:communication-between-containers-using-docker-compose-in-windows',
  '/posts/setting-up-raspberry-pi-for-kiosk-mode':
    'blog:setting-up-raspberry-pi-for-use-in-kiosk-mode-with-chromium'
};

/** Old URLs whose content is gone for good. They go home, not to a guess. */
const RETIRED = [
  '/posts/using-netlify-functions-to-add-comments-to-gridsome/',
  '/posts/cheers-to-2019-bring-on-2020/'
];

const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY, 'utf8'));
const entries = taxonomy.entries;

/** old path to new path. A Map so a duplicate source is caught rather than merged. */
const rules = new Map();
const problems = [];

function add(from, to) {
  const existing = rules.get(from);
  if (existing && existing !== to) {
    problems.push(`${from} is claimed by both ${existing} and ${to}`);
    return;
  }
  if (from === to) {
    problems.push(`${from} redirects to itself`);
    return;
  }
  rules.set(from, to);
}

function urlFor(key) {
  const e = entries[key];
  if (!e) {
    problems.push(`no taxonomy entry for ${key}`);
    return null;
  }
  return e.url;
}

/*
  1. Every article moves from /blog/[slug]/ to /[topic]/[slug]/.
     Both the slashed and unslashed forms are emitted, because the site is
     trailingSlash always and an unslashed request would otherwise take a second hop.
*/
for (const [key, e] of Object.entries(entries)) {
  if (!key.startsWith('blog:')) continue;
  const slug = key.slice('blog:'.length);
  add(`/blog/${slug}/`, e.url);
  add(`/blog/${slug}`, e.url);
}

/*
  2. Legacy /posts/ aliases go straight to the final topic first URL, not to /blog/.
     This is the chain that decision 19 exists to prevent.
*/
for (const [from, key] of Object.entries(LEGACY_ALIASES)) {
  const to = urlFor(key);
  if (!to) continue;
  add(from, to);
  add(from + '/', to);
}

for (const from of RETIRED) {
  add(from, '/');
  add(from.replace(/\/$/, ''), '/');
}

/*
  3. Index and pagination routes that v2 does not have. Topic pages replace the single
     flat blog index, and there is no combined video index either. Home carries the
     Fresh rail, so it is the honest destination rather than a topic picked at random.
*/
add('/blog/', '/');
add('/videos/', '/');
for (let n = 2; n <= 12; n++) {
  add(`/blog/${n}/`, '/');
  add(`/videos/${n}/`, '/');
}

const sorted = [...rules.entries()].sort(([a], [b]) => {
  // Longest first so a specific rule can never sit behind a shorter one that also
  // matches. Netlify takes the first match in file order.
  if (b.length !== a.length) return b.length - a.length;
  return a.localeCompare(b);
});

const width =
  Math.max(...sorted.flatMap(([from, to]) => [from.length, to.length]), '/brain-dump/*'.length) + 2;

function rule(from, to) {
  return `${from.padEnd(width)}${to.padEnd(width)}301!`;
}

const lines = [
  '# GENERATED by scripts/gen-redirects.mjs. Do not hand edit, run pnpm redirects.',
  '#',
  '# Decision 19: every old URL 301s straight to its final destination. No chains. That',
  '# is why every article has its own line instead of a /blog/* wildcard, and why the',
  '# legacy /posts/ aliases point at the topic first URL rather than at /blog/.',
  '#',
  '# Netlify takes the first match in file order, so specific rules sort before the',
  '# wildcards at the bottom.',
  '#',
  '# Legacy /posts/ aliases resolve through the content id rather than through the old',
  '# rule they replace, which is deliberate. The hand maintained file this replaces had',
  '# rotted in one place: /posts/code-of-conduct-and-contributions-in-public-repositories',
  '# pointed at a blog slug that was renamed years ago and 404s on production today.',
  '# Resolving from the id fixes it and stops the same rot recurring, because a',
  '# destination that stops existing now fails the build test instead of the visitor.',
  '',
  `# ${sorted.length} explicit rules`,
  ''
];

for (const [from, to] of sorted) {
  lines.push(rule(from, to));
}

lines.push(
  '',
  '# Safety net. Anything under these prefixes that is not named above was never a real',
  '# page, so it goes home rather than 404ing. These must stay last.',
  '',
  rule('/brain-dump/*', '/'),
  rule('/posts/*', '/'),
  ''
);

if (problems.length > 0) {
  console.error('redirect map problems:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`${sorted.length} explicit rules plus 2 wildcards, wrote public/_redirects`);
