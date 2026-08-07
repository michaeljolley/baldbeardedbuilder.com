/*
  Attach another way in to the account you already have.

  /account/ offers this for every provider not yet connected, and until now every one of
  those links 404ed because the route was never written. The config and the docs both
  describe it, which is how it went unnoticed: everything except the code said it existed.

  This is linkIdentity, not signInWithOAuth. The difference matters. signInWithOAuth on a
  browser that already holds a session replaces that session, so somebody who signed in
  with GitHub and pressed "Link it" on Twitch would end up signed in as a second, empty
  account rather than with two identities on one. linkIdentity adds the identity to the
  user who is already here.

  It needs manual linking turned on in the Supabase project. It fails quietly without it,
  so the failure lands on /account/?link=failed rather than as a stack trace nobody sees.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseWritable } from '../../../lib/supabase';
import { safeReturnPath } from '../../../lib/auth';
import { PROVIDER_SCOPES, isProvider } from '../../../lib/providers';

export const prerender = false;

/* Where a link ends up when it works, naming the provider so the notice can say which. */
const connections = (provider: string) => `/account/?link=ok&provider=${provider}#connections`;

export const GET: APIRoute = async ({ params, url, cookies, request, redirect, locals }) => {
  if (!supabaseWritable) {
    return redirect('/?auth=unavailable', 302);
  }

  const requested = params.provider ?? '';

  if (!isProvider(requested)) {
    return redirect('/account/?link=unknown#connections', 302);
  }

  /*
    Linking is something you do to an account, so there has to be one. Somebody who
    followed this link with an expired session goes to the chooser and comes back here
    afterwards rather than being told no.
  */
  if (!locals.profile) {
    const back = `/auth/link/${requested}/`;
    return redirect(`/signin/?next=${encodeURIComponent(back)}`, 302);
  }

  const next = safeReturnPath(url.searchParams.get('next') ?? connections(requested));

  const supabase = serverClient(cookies, request.headers);

  /*
    Back through the one callback rather than a per provider one. It already exchanges the
    code and refreshes provider columns, and `linked` tells it which provider to write,
    because app_metadata.provider still names the one this person originally signed in
    with rather than the one they just attached.
  */
  const redirectTo = new URL(
    `/auth/callback/?next=${encodeURIComponent(next)}&linked=${requested}`,
    url.origin
  ).toString();

  const { data, error } = await supabase.auth.linkIdentity({
    provider: requested,
    options: { redirectTo, scopes: PROVIDER_SCOPES[requested] }
  });

  if (error || !data?.url) {
    console.error(`[auth/link] could not start the ${requested} link`, error);
    return redirect(`/account/?link=failed&provider=${requested}#connections`, 302);
  }

  return redirect(data.url, 302);
};
