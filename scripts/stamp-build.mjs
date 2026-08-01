/*
  Stamps the built site with the tree it came from.

  This exists because of a real defect rather than as a nicety. A gate that reads dist
  reports a number, and that number describes whatever tree the last build happened to
  run against. Twice now that has not been the tree anybody thought it was: once from a
  stale dist left behind by mutation testing, and once from a dist built while somebody
  else's uncommitted experiment was sitting in three of the files. Both times the gates
  were clean, both times the numbers were true about something, and neither time did the
  output say what.

  So the build writes down its own subject and the gates read it back. A summary line
  that ends "built from ee25703 on dev/mjolley/v2, tree clean" is checkable. One that
  just says "clean across 270 audits" is not, and cannot be made so afterwards.

  The dirty flag is the part that matters most. A green run against a dirty tree is not
  wrong, it is just not a statement about the branch, and only the build knows which of
  those it was.
*/

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../dist/build-provenance.json', import.meta.url));

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/*
  Netlify builds from a detached checkout, so `git branch --show-current` is empty there
  and the branch only exists in the environment. Local builds are the other way round.
  Take whichever is available rather than preferring one and silently recording nothing.
*/
const sha = process.env.COMMIT_REF || git('rev-parse', 'HEAD');
const branch = process.env.BRANCH || git('rev-parse', '--abbrev-ref', 'HEAD');

/*
  Netlify checks out a specific commit into a fresh workspace, so its tree is clean by
  construction and `git status` there tells us nothing we did not already know. Locally
  it is the whole point of the file.

  Two commands rather than `git status --porcelain`, and the reason is a false dirty this
  caught on its first run in a clean worktree. `git status` compares working tree bytes
  against index bytes, so on Windows a generated file the build rewrote with LF into a
  CRLF checkout comes back modified with an empty diff. `git diff` normalises line endings
  the same way `gen:check` does, so the two now agree about what a change is.

  That mattered more than a tidy status line. A flag that says dirty on a checkout nobody
  touched is a flag people learn to read past, and the two incidents this file exists for
  both look exactly like a dirty flag on a tree somebody believed was clean.

  Tracked changes come from `git diff --name-only HEAD`, which covers staged and unstaged
  in one pass. Untracked files are a separate question git will not answer in the same
  command, and they matter here: a new file the build reads is a difference from the
  commit even though nothing tracked moved.
*/
const tracked = process.env.NETLIFY ? '' : git('diff', '--name-only', 'HEAD');
const untracked = process.env.NETLIFY ? '' : git('ls-files', '--others', '--exclude-standard');
const dirty = [...tracked.split('\n'), ...untracked.split('\n')]
  .map((l) => l.trim())
  .filter(Boolean);

const provenance = {
  sha: sha || 'unknown',
  shortSha: (sha || 'unknown').slice(0, 7),
  branch: branch || 'unknown',
  clean: dirty.length === 0,
  dirtyFiles: dirty,
  builtAt: new Date().toISOString(),
  ci: Boolean(process.env.NETLIFY || process.env.CI),
};

writeFileSync(OUT, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`stamped dist as ${provenance.shortSha} on ${provenance.branch}, tree ${provenance.clean ? 'clean' : `dirty in ${dirty.length} file(s)`}`);
