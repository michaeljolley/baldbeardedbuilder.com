/*
  A private profile is not named on the dev disaster wall.

  Occurrence fifteen. tellersFor() reads profiles through serviceClient(), which bypasses
  RLS by design, and it selected id and handle with no filter. The public read policy on
  that table is `using (is_private = false and deleted_at is null)`, so the one query that
  reads handles for public display was the one place the database's own visibility rule did
  not apply.

  The shape of the damage is what makes it worth a gate. /builders/[handle] 404s for a
  private profile, and the 404 IS the privacy mechanism, so the same handle was printed as
  a link into that 404 from the wall, the front page lead and the story page. The site
  refused to confirm somebody existed on one route and confirmed it on three others.

  These are source assertions rather than rendered ones. The wall is empty until the v2
  Supabase project exists, so there is no row to render and a dist test would pass by
  having nothing to look at, which is the failure this branch keeps cataloguing. When the
  database is live these should be joined by a rendered check.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const disasters = read(path.join('src', 'lib', 'disasters.ts'));

const PAGES = [
  path.join('src', 'pages', 'index.astro'),
  path.join('src', 'pages', 'dev-disasters', '[slug].astro'),
  path.join('src', 'pages', 'dev-disasters', '[...filter].astro')
];

test('the byline query asks whether the profile is visible', () => {
  const q = disasters.match(/\.from\('profiles'\)[\s\S]{0,200}?\.in\('id', ids\)/);
  assert.ok(q, 'the profiles lookup in tellersFor is gone or no longer selects by id');

  assert.match(
    q[0],
    /is_private/,
    'tellersFor no longer reads is_private. It runs through serviceClient(), which does ' +
      'not inherit RLS, so a private profile would be named on the public wall.'
  );
  assert.match(
    q[0],
    /deleted_at/,
    'tellersFor no longer reads deleted_at, so a deleted account would still be named'
  );
});

test('a hidden profile is turned into anonymous rather than dropped', () => {
  assert.match(
    disasters,
    /is_private \|\| p\.deleted_at !== null/,
    'the visibility predicate is no longer applied to each profile row'
  );
  assert.match(
    disasters,
    /shown: 'anonymous', why: 'private'/,
    'a hidden profile no longer resolves to an anonymous byline. If it were simply left ' +
      'out of the map it would be indistinguishable from a profile that does not exist.'
  );
});

test('a lookup that finds nothing does not claim the teller chose anonymity', () => {
  assert.match(
    disasters,
    /shown: 'nothing'/,
    'the unresolved case is gone, so a missing profile would render as a deliberate choice'
  );
  assert.doesNotMatch(
    disasters,
    /tellers\.get\([^)]*\) \?\? null/,
    'tellerFor is back to collapsing a map miss into the same value as anonymity'
  );
});

test('no page draws a byline of its own', () => {
  for (const p of PAGES) {
    const s = read(p);
    assert.doesNotMatch(
      s,
      /teller \?/,
      `${p} is drawing a teller with its own ternary again. Three copies of that ternary ` +
        'is how the privacy rule came to be applied in a query and not in a byline.'
    );
    assert.match(
      s,
      /<Teller teller=/,
      `${p} no longer renders the Teller component, so its byline rule can drift`
    );
  }
});

test('the byline component refuses to name an unresolved teller', () => {
  const c = read(path.join('src', 'components', 'Teller.astro'));
  assert.match(c, /shown === 'handle'/, 'the component no longer branches on a resolved handle');
  assert.match(
    c,
    /shown === 'anonymous'/,
    'the component no longer treats anonymous as its own case, so it may be drawing a ' +
      'handle or a blank for it'
  );
});

/*
  The same rule on the second surface, which is a view rather than a query.

  Comment bylines come out of comments_public, which left joins profiles. The view is
  security_invoker, so RLS on profiles applies to the join, and that sounds like cover
  until you read the grants: anon and authenticated are revoked entirely and service_role
  is the only grantee. readThread() reads it with the service role, which bypasses RLS. So
  the only reader of these bylines is the only reader RLS never covered, and the fix has to
  restate the predicate in the view.

  These tests read the LAST migration that creates the view rather than a named one. That
  is deliberate. Writing this fix, I edited the definition in the security fixup migration
  and was two steps from shipping it, having missed that a later migration had already
  dropped and recreated the view with a tombstone column my version did not have. A test
  pinned to a filename would have passed while the live view differed.
*/

const MIG = path.join(ROOT, 'supabase', 'migrations');
const migrations = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();

const lastCreating = (needle) => {
  const hit = migrations.filter((f) => fs.readFileSync(path.join(MIG, f), 'utf8').includes(needle)).pop();
  assert.ok(hit, `no migration contains ${needle}`);
  return fs.readFileSync(path.join(MIG, hit), 'utf8');
};

test('the comment view hides the byline of a private or deleted profile', () => {
  const sql = lastCreating('create view public.comments_public');
  for (const col of ['handle', 'display_name', 'avatar_url']) {
    const guarded = new RegExp(
      `is_private = false and p\\.deleted_at is null\\s*\\n\\s*then p\\.${col}`
    );
    assert.match(
      sql,
      guarded,
      `comments_public returns p.${col} without asking whether the profile is visible. ` +
        'Going private has to hide the name everywhere, and a service role read inherits ' +
        'no policy.'
    );
  }
});

test('the comment view is readable only by the role that bypasses RLS', () => {
  const sql = lastCreating('create view public.comments_public');
  assert.match(
    sql,
    /revoke all on public\.comments_public from anon, authenticated/,
    'the view is exposed to anon or authenticated again, which was undone once already'
  );
  assert.match(
    sql,
    /grant select on public\.comments_public to service_role/,
    'the service role grant is gone, so the API routes that read the thread lose access'
  );
});

test('the comment view still tells a reader what happened to a removed comment', () => {
  const sql = lastCreating('create view public.comments_public');
  assert.match(
    sql,
    /'account deleted'/,
    'the tombstone column is gone from comments_public. Hiding a name must not also ' +
      'delete the sentence that explains an empty row.'
  );
  assert.match(sql, /'comment removed'/, 'the other tombstone case is gone');
});

test('a story cannot lose its author without becoming anonymous', () => {
  const sql = lastCreating('disasters_author_pairing');
  assert.match(
    sql,
    /check \(is_anonymous or author_id is not null\)/,
    'decision 105 is gone. author_id null with is_anonymous false is a story that claims ' +
      'a named teller and cannot name one.'
  );
});

test('the privacy checkbox says the name comes off', () => {
  const copy = read(path.join('src', 'pages', 'account.astro'));
  const label = copy.match(/Hide my profile\.[\s\S]{0,240}?<\/label>/);
  assert.ok(label, 'the hide profile label is gone or reworded past recognition');
  assert.match(
    label[0],
    /your name comes off/,
    'the label promises the stories stay without saying the byline goes. Under the ruling ' +
      'both happen, and copy that describes a different system is how this branch has ' +
      'lost time repeatedly.'
  );
});

