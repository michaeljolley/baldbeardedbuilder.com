import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { isNewAccount, clearSession, oauthOutcome, NEW_ACCOUNT_HOLD_DAYS } from '../src/lib/auth.ts';
import {
  PROVIDER_LABELS,
  PROVIDER_NOTES,
  PROVIDER_SCOPES,
  providerLogin
} from '../src/lib/providers.ts';

const ROOT = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

const signin = read('src', 'pages', 'auth', 'signin.ts');
const chooser = read('src', 'pages', 'signin.astro');
const providers = read('src', 'lib', 'providers.ts');
const callback = read('src', 'pages', 'auth', 'callback.ts');
const signout = read('src', 'pages', 'auth', 'signout.ts');
const linkRoute = read('src', 'pages', 'auth', 'link', '[provider].ts');
const accountPage = read('src', 'pages', 'account.astro');
const accountLib = read('src', 'lib', 'account.ts');

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
  There was no way to sign out. The route was written, correctly, as a POST, and then
  nothing on the site ever called it, so the only way to end a session was to clear
  cookies by hand or wait for the token to expire.
*/
test('sign out is reachable from the account page', () => {
  assert.match(accountPage, /action="\/auth\/signout\/"/);
});

/*
  A GET sign out means any image tag on any page, anywhere, signs a reader out. It is a
  small piece of griefing and it costs one word to prevent, so this checks the word is
  still there.
*/
test('sign out refuses to happen on a GET', () => {
  assert.match(signout, /export const POST/);
  assert.doesNotMatch(signout, /export const (GET|ALL)/);
});

/*
  signOut is a network call to the auth server, and network calls fail. A browser still
  holding an sb- cookie after pressing sign out renders as signed in until the token
  expires, which is the single outcome the button exists to prevent, so the cookies get
  cleared outside the try rather than inside it.
*/
test('sign out clears the cookies even when the auth server does not answer', () => {
  const afterTheCatch = signout.slice(signout.lastIndexOf('} catch'));
  assert.match(afterTheCatch, /clearSession\(context\)/);
});

test('clearing the session drops the Supabase cookies and leaves the rest alone', () => {
  const deleted = [];
  clearSession({
    cookies: {
      headers: () => [
        'sb-access-token=one; Path=/',
        'sb-refresh-token=two; Path=/',
        'bbb-theme=ember; Path=/'
      ],
      delete: (name) => deleted.push(name)
    }
  });

  assert.deepEqual(deleted, ['sb-access-token', 'sb-refresh-token']);
});

/*
  Every "Link it" on /account/ pointed at /auth/link/<provider>/ and no such route had
  ever been written, so every one of them was a 404. The href and the route are two places
  saying the same thing, and this is the second place.
*/
test('the link route exists', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, 'src', 'pages', 'auth', 'link', '[provider].ts')),
    'the Link it buttons on /account/ point at a route that does not exist'
  );
});

test('every /auth/link/ href in the source is one the route can answer', () => {
  const offenders = [];

  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    if (relative === 'src/pages/auth/link/[provider].ts') continue;

    /* Quoted, so the prose in a comment that merely names the path is not a link. */
    for (const [match, target] of fs
      .readFileSync(file, 'utf8')
      .matchAll(/["'`]\/auth\/link\/([^'"`\s)/]+)\//g)) {
      /* The template literal the connections list builds, which covers all of them. */
      if (target === '${provider}' || target === '${requested}') continue;
      if (!PROVIDERS.includes(target)) offenders.push(`${relative} links to ${match}`);
    }
  }

  assert.deepEqual(offenders, [], `These link to a provider that cannot be linked:\n${offenders.join('\n')}`);
});

/*
  linkIdentity, not signInWithOAuth. signInWithOAuth on a browser that already holds a
  session replaces it, so pressing "Link it" would sign somebody in as a second, empty
  account rather than attaching an identity to the one they were looking at.
*/
test('linking attaches an identity rather than starting a new session', () => {
  assert.match(linkRoute, /auth\.linkIdentity\(/);
  assert.doesNotMatch(linkRoute, /auth\.signInWithOAuth\(/);
});

test('the link route refuses a provider it does not know', () => {
  assert.match(linkRoute, /isProvider\(requested\)/);
  assert.match(linkRoute, /provider:\s*requested/);
});

/*
  Linking is something done to an account, so there has to be one. Sending somebody
  through the handshake with no session produces a link that silently attaches to nobody.
*/
test('linking without a session goes to the chooser first', () => {
  assert.match(linkRoute, /locals\.profile/);
  assert.match(linkRoute, /\/signin\/\?next=/);
});

/*
  app_metadata.provider keeps naming whoever this person originally signed up as. Reading
  it on the way back from a link means a Twitch link on a GitHub account refreshes
  github_login and leaves twitch_user_id null, which reads as the link doing nothing.
*/
test('the callback tells a link apart from a sign in and writes the right columns', () => {
  assert.match(linkRoute, /linked=\$\{requested\}/);
  assert.match(callback, /searchParams\.get\('linked'\)/);
  assert.match(callback, /isLink \? linked :/);
});

/*
  user_metadata still describes whoever this person signed up as. Falling back to it on a
  link copies a GitHub username into twitch_login and calls the account linked when it is
  not, which is worse than leaving the column empty.
*/
test('a link does not fall back to the metadata of the provider already signed in', () => {
  assert.match(callback, /isLink \? undefined : \(meta\.provider_id/);
  assert.match(callback, /isLink \? null : providerLogin\(provider, meta/);
});

/*
  The bug. Supabase normalises nothing about identity_data, so the three providers put the
  login in three different places, and one shared chain of guesses covered two of them.
  Discord has no user_name, no preferred_username and no nickname, so every Discord link
  wrote discord_login as null while discord_id filled in beside it. These are the exact
  payloads supabase/auth's claims mappers emit, so a chain that stops covering one of them
  fails here rather than on somebody's account page.
*/
const GITHUB_IDENTITY = {
  iss: 'https://api.github.com',
  sub: '2058493',
  name: 'Michael Jolley',
  full_name: 'Michael Jolley',
  user_name: 'MichaelJolley',
  preferred_username: 'MichaelJolley',
  provider_id: '2058493',
  avatar_url: 'https://avatars.githubusercontent.com/u/2058493'
};

const DISCORD_IDENTITY = {
  iss: 'https://discord.com/api',
  sub: '183580131165601792',
  name: 'BaldBeardedBuilder#0',
  full_name: 'BaldBeardedBuilder',
  custom_claims: { global_name: 'Bald Bearded Builder' },
  provider_id: '183580131165601792',
  picture: 'https://cdn.discordapp.com/avatars/183580131165601792/abc.png'
};

const TWITCH_IDENTITY = {
  iss: 'https://api.twitch.tv',
  sub: '473294395',
  name: 'baldbeardedbuilder',
  full_name: 'baldbeardedbuilder',
  nickname: 'BaldBeardedBuilder',
  slug: 'BaldBeardedBuilder',
  provider_id: '473294395'
};

test('every provider has a login the site can find in what it actually sends', () => {
  assert.equal(providerLogin('github', GITHUB_IDENTITY), 'michaeljolley');
  assert.equal(providerLogin('discord', DISCORD_IDENTITY), 'baldbeardedbuilder');
  assert.equal(providerLogin('twitch', TWITCH_IDENTITY), 'baldbeardedbuilder');
});

/*
  Discord kept usernames unique and retired discriminators to "0", but an account that has
  not been migrated still arrives with a real one, and `name` is the only key some of them
  fill. A stored login of "someone#4821" would never match anything.
*/
test('a Discord discriminator is not part of the username', () => {
  assert.equal(providerLogin('discord', { name: 'someone#4821' }), 'someone');
  assert.equal(providerLogin('discord', { custom_claims: { global_name: 'Someone' } }), 'someone');
});

/*
  Twitch display names are the login recased for almost everybody, and "almost" is not
  something the badge backfill should be matching on. The login is what streamUsers holds.
*/
test('Twitch stores the login rather than the display name', () => {
  assert.equal(providerLogin('twitch', { name: 'notthesame', nickname: 'DisplayName' }), 'notthesame');
});

/*
  GitHub's `name` is the human's real name, which is not a login and is not unique. Reading
  it would put "michael jolley" in github_login and break every lookup keyed on it.
*/
test('GitHub does not mistake a real name for a username', () => {
  assert.equal(providerLogin('github', { name: 'Michael Jolley', user_name: 'MichaelJolley' }), 'michaeljolley');
});

/*
  No name is a real answer. The identity is attached either way, and null is what says so
  honestly rather than an empty string that renders as a bare "@".
*/
test('nothing usable reads as no name rather than an empty one', () => {
  assert.equal(providerLogin('discord', {}), null);
  assert.equal(providerLogin('discord', null), null);
  assert.equal(providerLogin('github', { user_name: '   ' }), null);
  assert.equal(providerLogin('twitch', { name: 42 }), null);
});

test('the callback asks the provider list where the login is instead of guessing', () => {
  assert.match(callback, /providerLogin\(provider, identityData\)/);
  assert.doesNotMatch(callback, /identityData\.preferred_username/);
  assert.doesNotMatch(callback, /identityData\.nickname/);
});

/*
  The connections list showed GitHub and Twitch and quietly omitted Discord, which had
  been a way in for as long as there had been three of them. Two hand written rows for
  three providers is how that happens, so the list renders from the provider list now.
*/
test('the connections list is drawn from the provider list, not written out by hand', () => {
  assert.match(accountPage, /PROVIDERS\.map/);
  assert.match(accountPage, /account\.connections\[provider\]/);
});

test('every provider has a label and a note, so the list has something to draw', () => {
  for (const provider of PROVIDERS) {
    assert.ok(PROVIDER_LABELS[provider], `${provider} has no label`);
    assert.ok(PROVIDER_NOTES[provider], `${provider} has no note saying what it is for`);
    assert.ok(PROVIDER_SCOPES[provider], `${provider} has no scopes`);
  }
});

/*
  The account read is a literal select, so a provider added to providers.ts without its
  column added there would compile but come back permanently "not connected".
*/
test('the account read asks for every provider login column', () => {
  for (const column of ['github_login', 'discord_login', 'twitch_login']) {
    assert.match(accountLib, new RegExp(column), `readAccount never selects ${column}`);
  }
});

/*
  A login is a display name. It is nullable, it changes, and Discord handed back an
  identity with no name the site could read for as long as the extraction was wrong, which
  is how an attached account rendered "Not connected" with a "Link it" beside it that could
  only ever fail with identity_already_exists. Attached is the id, and the id is the
  question the list has to ask.
*/
test('the account read asks for every provider id column, which is what says connected', () => {
  for (const column of ['github_id', 'discord_id', 'twitch_user_id']) {
    assert.match(accountLib, new RegExp(column), `readAccount never selects ${column}`);
  }
});

/*
  auth.identities is what linkIdentity writes and therefore the only thing that actually
  knows. The profile columns are a projection of it, and a projection written by code that
  was looking for the wrong keys is exactly the thing that cannot be trusted here.
*/
test('connections are read from the identities, not from whether a name was stored', () => {
  assert.match(accountLib, /identities/);
  assert.match(accountLib, /connected:/);
  assert.doesNotMatch(accountLib, /connections: Record<Provider, string \| null>/);
});

test('the connections list separates being attached from having a name to show', () => {
  assert.match(accountPage, /connection\.connected/);
  assert.match(accountPage, /connection\.login/);
});

/*
  The bug this set of tests exists for. Approving a Discord link and being returned to
  /account/?link=cancelled reads as the site calling you a liar, and it happened because
  the callback treated every code-less return as a cancellation. Supabase reports refusals
  and cancellations the same way, minus the code, so the parameters beside it are the only
  thing that can tell them apart.
*/
const outcomeOf = (query) => oauthOutcome(new URLSearchParams(query)).outcome;

test('pressing cancel at the provider is the only thing reported as a cancellation', () => {
  assert.equal(outcomeOf('error=access_denied&error_description=The+user+denied+the+request'), 'cancelled');
  assert.equal(outcomeOf('error=server_error&error_code=access_denied'), 'cancelled');
});

test('an identity already attached here is named rather than blamed on the reader', () => {
  assert.equal(outcomeOf('error=server_error&error_code=identity_already_exists'), 'exists');
  assert.equal(outcomeOf('error=422&error_code=user_already_exists'), 'exists');
  assert.equal(
    outcomeOf('error=server_error&error_description=Identity+is+already+linked+to+another+user'),
    'exists'
  );
});

test('a refusal after approval is a failure, not a cancellation', () => {
  assert.equal(outcomeOf('error=server_error&error_code=manual_linking_disabled'), 'failed');
  assert.equal(outcomeOf('error=temporarily_unavailable'), 'failed');
  assert.equal(outcomeOf('error_description=Something+went+wrong'), 'failed');
});

/*
  A cancellation always says so. An empty query string is a hand typed URL or a handshake
  that lost its parameters, and answering that with "you cancelled" is the guess being
  removed here.
*/
test('nothing at all is not evidence of a cancellation', () => {
  assert.equal(outcomeOf(''), 'failed');
});

test('the reason Supabase gave survives for the log', () => {
  const { detail } = oauthOutcome(
    new URLSearchParams('error=server_error&error_code=identity_already_exists&error_description=Already+linked')
  );

  assert.match(detail, /identity_already_exists/);
  assert.match(detail, /Already linked/);
});

test('the callback classifies a code-less return rather than assuming it was cancelled', () => {
  assert.match(callback, /oauthOutcome\(url\.searchParams\)/);
  assert.doesNotMatch(callback, /link=cancelled/);
});

/*
  The reason only reaches a human if something writes it down. Every one of these paths
  used to redirect in silence, which is why nobody could say why a link had failed.
*/
test('a link that comes back without a code says why in the log', () => {
  assert.match(callback, /console\.error\(/);
});

test('every outcome the callback can send is one the account page can render', () => {
  const outcomes = [...callback.matchAll(/\?link=(\w+)/g)].map(([, name]) => name);
  const sent = [...linkRoute.matchAll(/\?link=(\w+)/g)].map(([, name]) => name);

  for (const outcome of new Set([...outcomes, ...sent])) {
    assert.match(
      accountPage,
      new RegExp(`^\\s*${outcome}:`, 'm'),
      `the routes send ?link=${outcome} and /account/ has no message for it`
    );
  }
});

/*
  "That account could not be connected" three times over tells somebody nothing about which
  of their three buttons just failed, so the provider rides along with the outcome.
*/
test('the notice can name the provider the link was for', () => {
  assert.match(callback, /&provider=\$\{linked\}/);
  assert.match(linkRoute, /provider=\$\{requested\}/);
  assert.match(accountPage, /PROVIDER_LABELS\[linkProvider\]/);
});

/*
  A broken sign in used to end at /?auth=failed, and nothing on the site reads that
  parameter, so the front page rendered as though nothing had been attempted. The chooser
  is the only page holding the buttons to try again with, so that is where a failure goes,
  and it says so when it gets there.
*/
test('a sign in that breaks lands somewhere that admits it', () => {
  assert.doesNotMatch(callback, /auth=failed'/);
  assert.match(callback, /\/signin\/\?auth=failed&next=/);
  assert.match(signin, /\/signin\/\?auth=failed&next=/);
  assert.match(chooser, /searchParams\.get\('auth'\) === 'failed'/);
});

/*
  Backing out of a sign in is a decision rather than a fault. Somebody who changes their
  mind at the provider goes back to the page they were reading, not to an apology.
*/
test('cancelling a sign in returns the reader where they were', () => {
  assert.match(callback, /outcome === 'cancelled'\) return redirect\(next/);
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
