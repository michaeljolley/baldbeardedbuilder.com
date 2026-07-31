/*
  v1 sends no email, and this stops half of that coming back.

  The notification code is still in the tree, unwired on purpose, because the thinking in
  it is worth keeping. That is a comfortable arrangement right up until somebody restores
  one piece of it without the others and the site starts promising email it does not send,
  on the page where a person is deciding whether to hand over the worst thing that ever
  happened to them at work.

  Every assertion here is one half of a pair that has to move together. Turning the
  feature on means deleting this file, and deleting this file is a large enough diff that
  nobody does it by accident. docs/notifications.md is the procedure.

  These are source assertions rather than build assertions on purpose. They fail in
  seconds, before the build and axe stages, and the thing being guarded is a decision
  rather than an artifact.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(ROOT, ...parts));

test('the unsubscribe page is not a route', () => {
  assert.equal(
    exists('src', 'pages', 'unsubscribe.astro'),
    false,
    'src/pages/unsubscribe.astro is back. A page saying "that is switched off" for a thing that never sends is a control that appears to work.'
  );
  assert.ok(
    exists('src', 'pages', '_unwired', 'unsubscribe.astro'),
    'the unsubscribe page has gone missing entirely. It should be parked under _unwired, not deleted.'
  );
});

test('nothing audits a page that does not exist', () => {
  assert.equal(
    read('scripts', 'a11y.mjs').includes('/unsubscribe/'),
    false,
    'a11y.mjs audits /unsubscribe/, which is a 404. Auditing a 404 passes and proves nothing.'
  );
});

test('the email queue is not in the applied chain', () => {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const offenders = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => /create table\s+public\.email_outbox/i.test(fs.readFileSync(path.join(dir, f), 'utf8')));

  assert.deepEqual(
    offenders,
    [],
    'email_outbox is created by a migration in the applied chain. A queue nothing drains is worse than no queue.'
  );
});

test('the queue migration is still parked rather than deleted', () => {
  assert.ok(
    exists('supabase', 'deferred', '20260801000100_notifications.sql'),
    'the deferred notifications migration has gone missing. Park it, do not delete it.'
  );
});

test('featuring did not go with the email that used to key off it', () => {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const sql = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');

  assert.ok(
    /add column featured_at/i.test(sql),
    'disasters.featured_at is not in the applied chain. leadDisaster() reads it, so the front page lead goes with it.'
  );

  /*
    The column on its own is not enough. The Featured badge grant used to live inside the
    same trigger branch that enqueued the story_featured email, so deferring the email
    deferred the badge and left one on the shelf that no action could ever earn. That is
    the same shape as a preference for an event with no cause, which is the bug this whole
    file exists downstream of.
  */
  assert.ok(
    /badge_grants[\s\S]{0,200}'featured'/i.test(sql),
    "nothing in the applied chain grants the Featured badge. It is seeded in 20260710000200_v2_seed.sql, so without a grant path it is a badge on the shelf that cannot be earned."
  );
});

test('the featured badge is granted once, and not by the email trigger', () => {
  const featured = read('supabase', 'migrations', '20260801000000_featured.sql');
  const deferred = read('supabase', 'deferred', '20260801000100_notifications.sql');

  assert.ok(
    featured.includes('grant_featured_badge'),
    'the featured migration no longer carries the badge trigger.'
  );
  assert.equal(
    /insert into public\.badge_grants/i.test(deferred),
    false,
    'the deferred notifications migration grants the badge again. Applying it would double up with the trigger in the chain, and on conflict do nothing would hide that rather than report it.'
  );
});

test('saving your account does not write preferences nothing reads', () => {
  assert.equal(
    read('src', 'lib', 'account.ts').includes("from('notification_prefs')"),
    false,
    'saveAccount touches notification_prefs again. The settings form has no switches, and a form with no switches posts no fields, so every save writes three falses nobody chose.'
  );
});

test('the settings page offers no switch for a thing that does not happen', () => {
  const account = read('src', 'pages', 'account.astro');
  for (const field of ['story_published', 'story_featured', 'comment_reply']) {
    assert.equal(
      account.includes(field),
      false,
      `account.astro offers a ${field} switch. A toggle wired to a table nothing drains is worse than no toggle.`
    );
  }
});

test('no page promises an email', () => {
  /*
    Deliberately narrow, in two directions.

    It looks for the promise, not for the word. "email me" on the conduct page is a reader
    writing to Michael and has to keep working, and the privacy page has to be able to say
    "not a notification, not a digest" without tripping its own guard. A bare word match
    fails on the denial, which is the one sentence that most needs to stay.

    So these are all constructions that only appear when the site is telling somebody it
    will write to them, or offering them a switch over it.
  */
  const promises = [
    /\bemail you\b/i,
    /\bemails? you\b/i,
    /\bget an email\b/i,
    /\bemail either way\b/i,
    /\bone click unsubscribe\b/i,
    /\bturn (the |a )?notifications? (on|off)\b/i,
    /\bnotifications? (are|is) per type\b/i
  ];

  const dir = path.join(ROOT, 'src', 'pages');
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      if (e.name.startsWith('_')) return [];
      const full = path.join(d, e.name);
      return e.isDirectory() ? walk(full) : full.endsWith('.astro') ? [full] : [];
    });

  for (const file of walk(dir)) {
    const body = fs.readFileSync(file, 'utf8');
    for (const promise of promises) {
      assert.equal(
        promise.test(body),
        false,
        `${path.relative(ROOT, file)} matches ${promise}. This site sends no email, so no page may say it does.`
      );
    }
  }
});
