import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { isNewAccount, NEW_ACCOUNT_HOLD_DAYS } from '../src/lib/auth.ts';

const ROOT = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

const signin = read('src', 'pages', 'auth', 'signin.ts');
const chooser = read('src', 'pages', 'signin.astro');
const providers = read('src', 'lib', 'providers.ts');
const callback = read('src', 'pages', 'auth', 'callback.ts');

test('GitHub OAuth returns to the canonical trailing-slash callback URL', () => {
  assert.match(signin, /`\/auth\/callback\/\?next=\$\{encodeURIComponent\(next\)\}`/);
  assert.doesNotMatch(signin, /`\/auth\/callback\?next=/);
});

const PROVIDERS = ['github', 'discord', 'twitch'];

test('all three providers are offered, and the scopes list is what decides that', () => {
  for (const provider of PROVIDERS) {
    assert.match(
      providers,
      new RegExp(`^\\s*${provider}:\\s*'`, 'm'),
      `${provider} has no scopes, so it cannot be signed in with`
    );
  }
});

/*
  signInWithOAuth will happily start a handshake with any provider name it is handed, and
  the failure shows up as a confusing error from Supabase rather than as a bad request
  here. The allowlist is the guard, so this checks the guard is the thing being consulted
  rather than the query string.
*/
test('the sign in route refuses a provider it does not know', () => {
  assert.match(signin, /isProvider\(requested\)/);
  assert.match(signin, /provider:\s*requested/);
  assert.doesNotMatch(signin, /provider:\s*'(github|discord|twitch)'/);
});

/*
  Decision 4 used to make GitHub the default. Falling back to it now would mean somebody
  who clicked Discord and hit a malformed link gets signed in as GitHub instead, which is
  a worse outcome than being asked again.
*/
test('a missing provider goes back to the chooser rather than picking one', () => {
  assert.match(signin, /redirect\(`\/signin\/\?next=/);
});

test('the chooser offers every configured provider and nothing it invented', () => {
  assert.match(chooser, /PROVIDERS\.map/);
  assert.match(chooser, /\/auth\/signin\/\?provider=\$\{provider\}/);
});

/*
  A page that renders an unchecked `next` into three hrefs is a page that writes phishing
  links on request. safeReturnPath is what stops that, and it has to run here as well as
  in the route the links point at.
*/
test('the chooser checks next before rendering it into a link', () => {
  assert.match(chooser, /safeReturnPath\(Astro\.url\.searchParams\.get\('next'\)\)/);
});

/*
  GitHub is the only one of the three that says when the account was made, and the columns
  are named for it. Writing a Discord id into github_id would break the unique constraint
  the moment two people arrive from different providers.
*/
test('the callback only writes the columns belonging to the provider just used', () => {
  assert.match(callback, /provider === 'github'/);
  assert.match(callback, /patch\.discord_id/);
  assert.match(callback, /patch\.twitch_user_id/);
  assert.doesNotMatch(callback, /identities\?\.find\(\(i\) => i\.provider === 'github'\)/);
});

/*
  Signing in with Twitch proves the same thing the link flow proves, so the badge backfill
  should not make that person walk through /auth/link/twitch/ to claim history they have
  already demonstrated they own.
*/
test('signing in with Twitch counts as linking Twitch', () => {
  assert.match(callback, /patch\.twitch_linked_at/);
});

/*
  Decision 16's hold reads github_created_at, and Discord and Twitch never fill it. Held on
  a null forever is not a hold, it is a ban nobody decided to hand out, so the profile's
  own creation date is the fallback.
*/
const NOW = new Date('2026-08-09T00:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

test('an established GitHub account is not held', () => {
  assert.equal(isNewAccount(daysAgo(400), daysAgo(1), NOW), false);
});

test('a fresh GitHub account is held even if the profile here is older', () => {
  assert.equal(isNewAccount(daysAgo(1), daysAgo(400), NOW), true);
});

test('a Discord or Twitch account falls back to when it joined this site', () => {
  assert.equal(isNewAccount(null, daysAgo(NEW_ACCOUNT_HOLD_DAYS + 1), NOW), false);
  assert.equal(isNewAccount(null, daysAgo(1), NOW), true);
});

test('knowing neither date still holds, because guessing the other way invites spam', () => {
  assert.equal(isNewAccount(null, null, NOW), true);
  assert.equal(isNewAccount(undefined, undefined, NOW), true);
  assert.equal(isNewAccount('not a date', null, NOW), true);
});

test('the hold lifts exactly on the boundary rather than a day late', () => {
  assert.equal(isNewAccount(daysAgo(NEW_ACCOUNT_HOLD_DAYS), null, NOW), false);
});

test('every sign in link points at the chooser, not at the bare redirect', () => {
  const offenders = [];

  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    /* The route itself and the chooser that feeds it both name it on purpose. */
    if (relative === 'src/pages/auth/signin.ts' || relative === 'src/pages/signin.astro') continue;

    const source = fs.readFileSync(file, 'utf8');
    for (const [match] of source.matchAll(/\/auth\/signin\/[^'"`\s)]*/g)) {
      if (!match.includes('provider=')) offenders.push(`${relative} links to ${match}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `These send people to the redirect with no provider, which just bounces:\n${offenders.join('\n')}`
  );
});

/*
  20260805000000_base_table_grants.sql revokes every table privilege in public from anon
  and authenticated, and the argument for doing that is a claim about this source tree:
  serverClient is only ever used for the auth handshake, so nothing reads public as the
  visitor. When the claim was written it was already false. Middleware was selecting from
  profiles that way, so it returned permission denied, and because only data was
  destructured, a signed in reader silently rendered as a signed out one.

  The grant is the right call and the claim is the thing that rotted, so this checks the
  claim. If a serverClient ever needs a .from again, the grant has to be revisited in the
  same change, not discovered later from a page that looks logged out.
*/
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|astro|mjs)$/.test(entry.name) ? [full] : [];
  });
}

test('no serverClient reads the public schema, which is what the grants migration assumes', () => {
  const offenders = [];

  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('serverClient(')) continue;

    const relative = path.relative(ROOT, file).split(path.sep).join('/');

    /* serverClient(...).from(...) with no variable in between. */
    if (/serverClient\([^)]*\)\s*\.\s*(from|rpc)\s*\(/.test(source)) {
      offenders.push(`${relative} chains .from or .rpc straight off serverClient()`);
    }

    /* And the usual shape, where the client is held in a variable first. */
    for (const [, name] of source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?serverClient\(/g)) {
      if (new RegExp(`\\b${name}\\s*\\.\\s*(from|rpc)\\s*\\(`).test(source)) {
        offenders.push(`${relative} calls ${name}.from or ${name}.rpc`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `These read public as anon or authenticated, which the base table grants revoked:\n${offenders.join('\n')}`
  );
});
