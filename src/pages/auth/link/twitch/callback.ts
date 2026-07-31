/*
  Where Twitch sends somebody back to after they agree to the link.

  Captures the Twitch user id, not just the login. Conflict 10 in the build plan is
  precisely this: streamEvents and streamUsers are keyed by login, logins change, and
  matching a linked account by login silently drops anybody who ever renamed. The id
  never changes, so it is what the backfill should key on. The login is stored too,
  because the existing history has nothing else to join on until the ids are backfilled.
*/

import type { APIRoute } from 'astro';
import { serverClient, serviceClient, supabaseWritable } from '../../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, redirect }) => {
  if (!supabaseWritable) return redirect('/account/?link=unavailable', 302);

  const supabase = serverClient(cookies, request.headers);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return redirect('/auth/signin/?next=/account/', 302);

  const twitch = data.user.identities?.find((i) => i.provider === 'twitch');
  if (!twitch) return redirect('/account/?link=failed', 302);

  const identity = (twitch.identity_data ?? {}) as Record<string, unknown>;

  const userId = String(twitch.id ?? identity.provider_id ?? identity.sub ?? '');
  const login = String(
    (identity.preferred_username as string) ??
      (identity.nickname as string) ??
      (identity.user_name as string) ??
      ''
  ).toLowerCase();

  if (!userId) return redirect('/account/?link=failed', 302);

  const db = serviceClient();

  const { error: writeError } = await db
    .from('profiles')
    .update({
      twitch_user_id: userId,
      twitch_login: login || null,
      twitch_linked_at: new Date().toISOString()
    })
    .eq('id', data.user.id);

  if (writeError) return redirect('/account/?link=failed', 302);

  /*
    Grant straight away rather than waiting for the nightly job.

    The original plan deferred this on the grounds that a scan of twenty four thousand rows
    is not something to make somebody wait for. With an index on lower(login) it is a few
    milliseconds, and the alternative is telling somebody who just linked their account to
    come back tomorrow and see if it worked. The nightly job still runs, because it catches
    anybody whose numbers moved after they linked.

    A failure here is deliberately not fatal. The link succeeded, which is the thing that
    was asked for, and the nightly job will pick up the grants.
  */
  await db.rpc('grant_badges', { p_profile: data.user.id, p_source: 'backfill' });

  return redirect('/account/?link=ok', 302);
};
