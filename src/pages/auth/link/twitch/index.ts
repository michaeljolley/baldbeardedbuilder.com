/*
  Linking a Twitch account.

  Decision 4 says GitHub is the only way in, and decision 13 says the badge backfill runs
  off an optional Twitch link. Both are satisfied by treating Twitch as an identity you
  attach to an account you already have, never as a way to create one. That is why this
  route refuses anybody who is not already signed in, rather than falling through to a
  Twitch sign in.

  Only the identity link starts here. Writing twitch_login and twitch_user_id is the
  callback's job, because the identity does not exist until the reader has said yes on
  Twitch's side.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseWritable } from '../../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, redirect, locals, url }) => {
  if (!supabaseWritable) return redirect('/account/?link=unavailable', 302);
  if (!locals.profile) return redirect('/auth/signin/?next=/account/', 302);

  const supabase = serverClient(cookies, request.headers);

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'twitch',
    options: {
      /*
        The origin the reader actually asked for, not the production one. A branch deploy
        that hands Twitch the live URL sends people to the live site halfway through
        linking an account on staging.
      */
      redirectTo: new URL('/auth/link/twitch/callback/', url.origin).toString(),
      /*
        Nothing beyond identity. The backfill matches on the Twitch user id, which arrives
        in the identity itself, so asking for a token that could read anything else would
        be asking for permission we have no use for.
      */
      scopes: 'user:read:email'
    }
  });

  if (error || !data?.url) return redirect('/account/?link=failed', 302);

  return redirect(data.url, 302);
};
