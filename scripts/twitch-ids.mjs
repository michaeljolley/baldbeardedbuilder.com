/*
  Backfilling stable Twitch ids into streamUsers.

  Conflict 10 in the build plan, and the reason it matters: streamEvents and streamUsers are
  keyed by a Twitch login, and logins change. A backfill that matches a linked account by
  login silently drops anybody who ever renamed, which shows up as an empty badge shelf for
  exactly the long time community members the backfill exists to reward. There is no error,
  no log line and nothing to notice. The person just gets nothing and assumes the feature is
  broken, which it is, for them.

  The fix is to store the id, which never changes. This script fills it in for the 1,850
  logins already in the history, using Twitch's users endpoint, a hundred at a time.

  Anything it cannot resolve is left null, which is the correct answer rather than a
  failure: a null id means that login has been deleted or renamed since, and badge_counts
  already falls back to a login match in that case.

  Needs TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET, plus the usual Supabase service role.
  Without them it explains itself and exits without touching anything, because a half
  finished id backfill is worse than none: the fallback in badge_counts only applies when no
  row for that login carries an id.

  Safe to run repeatedly. Only rows with a null id are looked up.
*/

import process from 'node:process';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

/* Twitch takes a hundred logins per request and nothing larger. */
const BATCH = 100;

function missing() {
  const gaps = [];
  if (!SUPABASE_URL) gaps.push('PUBLIC_SUPABASE_URL');
  if (!SERVICE_KEY) gaps.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!CLIENT_ID) gaps.push('TWITCH_CLIENT_ID');
  if (!CLIENT_SECRET) gaps.push('TWITCH_CLIENT_SECRET');
  return gaps;
}

async function appToken() {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials'
  });

  const res = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body });
  if (!res.ok) throw new Error(`twitch token: ${res.status} ${await res.text()}`);

  const json = await res.json();
  return json.access_token;
}

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  if (!res.ok) throw new Error(`supabase ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function resolve(token, logins) {
  const qs = logins.map((l) => `login=${encodeURIComponent(l)}`).join('&');
  const res = await fetch(`https://api.twitch.tv/helix/users?${qs}`, {
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${token}` }
  });

  /*
    Rate limited. Helix hands back a reset timestamp in seconds, so wait it out rather than
    giving up: this runs once and correctness beats finishing quickly.
  */
  if (res.status === 429) {
    const reset = Number(res.headers.get('ratelimit-reset') ?? 0) * 1000;
    const wait = Math.max(1000, reset - Date.now());
    console.log(`twitch-ids: rate limited, waiting ${Math.round(wait / 1000)}s`);
    await new Promise((r) => setTimeout(r, wait));
    return resolve(token, logins);
  }

  if (!res.ok) throw new Error(`twitch users: ${res.status} ${await res.text()}`);

  const json = await res.json();
  return new Map((json.data ?? []).map((u) => [String(u.login).toLowerCase(), String(u.id)]));
}

async function main() {
  const gaps = missing();
  if (gaps.length) {
    console.log(`twitch-ids: skipped, missing ${gaps.join(', ')}`);
    console.log('twitch-ids: badge matching falls back to logins until this runs.');
    return;
  }

  const rows = await rest('streamUsers?select=login&twitch_user_id=is.null&limit=5000');
  const logins = [...new Set(rows.map((r) => String(r.login).toLowerCase()).filter(Boolean))];

  if (!logins.length) {
    console.log('twitch-ids: nothing to resolve, every login already has an id');
    return;
  }

  console.log(`twitch-ids: resolving ${logins.length} logins`);
  const token = await appToken();

  let found = 0;
  let gone = 0;

  for (let i = 0; i < logins.length; i += BATCH) {
    const chunk = logins.slice(i, i + BATCH);
    const ids = await resolve(token, chunk);

    /*
      One request per resolved login rather than a bulk upsert. An upsert would need every
      not-null column on streamUsers, and inventing a display name for a row that already
      has one is how a backfill quietly wipes data it was only supposed to read.
    */
    for (const login of chunk) {
      const id = ids.get(login);
      if (!id) {
        gone += 1;
        continue;
      }

      await rest(`streamUsers?login=eq.${encodeURIComponent(login)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ twitch_user_id: id })
      });

      found += 1;
    }

    console.log(`twitch-ids: ${Math.min(i + BATCH, logins.length)} of ${logins.length}`);
  }

  console.log(`twitch-ids: resolved ${found}, ${gone} logins no longer exist on Twitch`);

  /*
    Regrant, because a profile that was matching on a login may now match on an id, and a
    profile that was matching on nothing may now match at all.
  */
  await rest('rpc/backfill_badges', { method: 'POST', body: '{}' });
  console.log('twitch-ids: badges regranted');
}

main().catch((error) => {
  console.error(`twitch-ids: ${error.message}`);
  process.exitCode = 1;
});
