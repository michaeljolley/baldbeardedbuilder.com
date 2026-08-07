/*
  Linking a Twitch account.

  Decision 13 used to say Twitch was link only, an identity you attach to an account you
  already have and never a way to create one. That is revised: Twitch can sign you in now,
  and doing so fills twitch_user_id on the way past.

  This route survives the change because it is still the only way for somebody whose
  account came from GitHub or Discord to prove they own a Twitch login. It refuses anybody
  who is not already signed in, because linking an identity to nothing is not a thing.

  Only the identity link starts here. Writing twitch_login and twitch_user_id is the
  callback's job, because the identity does not exist until the reader has said yes on
  Twitch's side.

  Worth knowing: linkIdentity needs manual linking switched on in the project's auth
  settings. With it off, this fails at the first call and the reader gets ?link=failed
  with nothing to tell them why.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseWritable } from '../../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, redirect, locals, url }) => {
  if (!supabaseWritable) return redirect('/account/?link=unavailable', 302);
  if (!locals.profile) return redirect('/signin/?next=/account/', 302);

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
