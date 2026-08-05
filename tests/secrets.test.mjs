/*
  Nothing holding a real credential is one careless command away from a public repo.

  .gitignore used to name .env and .env.production, the two files that happened to exist
  the day it was written. Any other variant, .env.local from a debugging session or a
  .env.audit-bak left over from a check, was untracked AND unignored, which is the one
  state where git add -A stages it. The rule is inverted now, ignore everything env shaped
  and allow the samples by name, but that is still a list somebody has to maintain, and a
  list is what failed the first time.

  So these tests do not name filenames. They ask git what is actually in the working tree
  and what is actually tracked, which means a variant nobody has thought of yet is caught
  the moment it appears rather than the moment somebody remembers to add it.

  Three questions, in order of how badly you want the answer to be no:

  1. Is anything env shaped sitting untracked and unignored right now, on this machine?
  2. Does any tracked env sample carry a value rather than an empty key?
  3. Does any tracked file at all contain something with the shape of a live credential?

  The third is the widest and the most useful, because the next leak will not be in a file
  called .env. It will be a fixture, a doc, or a comment written while debugging.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/* Anything whose name suggests it holds configuration rather than code. */
const ENV_SHAPED = /(^|\/)\.?env($|[.\-_])|(^|\/)\.env/i;

/*
  Deliberately allowed in the repository. Both are tracked, both must stay tracked, and
  test 2 holds them to being empty, so this list cannot be used to smuggle a value in.
*/
const ALLOWED_ENV_FILES = new Set(['.env-sample', '.env.example', 'src/env.d.ts']);

/*
  Shapes that only a real credential has. Each one is a vendor prefix plus enough length
  that a placeholder cannot reach it by accident, so "your_key_here" and "re_xxx" both
  pass and a live key does not.
*/
const CREDENTIAL_SHAPES = [
  ['JSON web token', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['Supabase secret or publishable key', /sb_(secret|publishable)_[A-Za-z0-9_-]{20,}/],
  ['Resend API key', /\bre_[A-Za-z0-9]{24,}/],
  ['GitHub personal access token', /\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{36}\b/],
  ['GitHub fine grained token', /\bgithub_pat_[A-Za-z0-9_]{50,}/],
  ['OpenAI API key', /\bsk-[A-Za-z0-9]{32,}/],
  ['Private key block', /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/]
];

const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.zip', '.gz', '.mp4', '.webm', '.mp3', '.wav'
]);

test('nothing env shaped is untracked and unignored', () => {
  /*
    --others is untracked, --exclude-standard drops anything .gitignore covers. So this
    lists exactly the files a git add -A would stage without being asked to. An env file
    in here is a credential one keystroke from a public remote.
  */
  const exposed = git('ls-files', '--others', '--exclude-standard').filter((f) =>
    ENV_SHAPED.test(f)
  );

  assert.deepEqual(
    exposed,
    [],
    `env shaped files are untracked and unignored, so git add -A would stage them:\n` +
      exposed.map((f) => `  ${f}`).join('\n') +
      `\nDelete them, move them outside the repository, or widen .gitignore.`
  );
});

test('every tracked env file is allowed by name', () => {
  const tracked = git('ls-files').filter((f) => ENV_SHAPED.test(f));
  const unexpected = tracked.filter((f) => !ALLOWED_ENV_FILES.has(f));

  assert.deepEqual(
    unexpected,
    [],
    `env shaped files are committed and were not on the allow list:\n` +
      unexpected.map((f) => `  ${f}`).join('\n')
  );
});

test('tracked env samples declare keys and never values', () => {
  for (const file of ALLOWED_ENV_FILES) {
    if (file.endsWith('.d.ts')) continue;

    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;

    const withValues = fs
      .readFileSync(full, 'utf8')
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => line && !line.startsWith('#') && line.includes('='))
      .filter(({ line }) => line.slice(line.indexOf('=') + 1).trim().length > 0);

    assert.deepEqual(
      withValues.map(({ n, line }) => `${n}: ${line.split('=')[0]}`),
      [],
      `${file} should declare empty keys only, so it can never carry a real value. ` +
        `A default belongs in code, where it is visible, not in a sample somebody copies.`
    );
  }
});

test('no tracked file contains anything shaped like a live credential', () => {
  const findings = [];

  for (const file of git('ls-files')) {
    if (SKIP_EXT.has(path.extname(file).toLowerCase())) continue;

    const full = path.join(ROOT, file);
    /* A submodule path is listed by ls-files but is a directory here. */
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;

    const text = fs.readFileSync(full, 'utf8');

    for (const [what, pattern] of CREDENTIAL_SHAPES) {
      const hit = text.match(pattern);
      if (!hit) continue;

      /*
        Report where and what, never the value. A test failure scrolls past a lot of eyes
        and gets pasted into a lot of places, so it must not be the thing that spreads it.
      */
      const line = text.slice(0, hit.index).split('\n').length;
      findings.push(`${file}:${line} looks like a ${what}`);
    }
  }

  assert.deepEqual(findings, [], `possible credentials in tracked files:\n${findings.join('\n')}`);
});
