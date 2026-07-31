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

  const { error: writeError } = await serviceClient()
    .from('profiles')
    .update({
      twitch_user_id: userId,
      twitch_login: login || null,
      twitch_linked_at: new Date().toISOString()
    })
    .eq('id', data.user.id);

  if (writeError) return redirect('/account/?link=failed', 302);

  /*
    Badges are granted by the backfill job rather than here. A link is one click, the
    backfill is a scan of twenty four thousand rows, and making the person wait for the
    second to finish the first would be the wrong trade.
  */
  return redirect('/account/?link=ok', 302);
};
