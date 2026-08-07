/*
  Where the provider sends the reader back to.

  Exchanges the one time code for a session, sets the cookies, and returns them to
  wherever they were when they decided to sign in.

  Both flows land here. A sign in arrives with no `linked` parameter, and a link started
  from /auth/link/<provider>/ arrives with one naming the provider that was just attached.
  They need telling apart, because app_metadata.provider keeps naming whichever provider
  this person originally signed up with, so a Twitch link on a GitHub account would
  otherwise refresh the GitHub columns and leave twitch_user_id null.

  The profile row is not created here. It is created by the on_auth_user_created trigger
  in the database, in the same transaction as the auth user, so there is no window in
  which somebody is signed in but has no profile. Doing it here would leave that window
  open every time this route failed halfway.
*/

import type { APIRoute } from 'astro';
import { serverClient, serviceClient, supabaseWritable } from '../../lib/supabase';
import type { Database } from '../../lib/supabase/database.types';
import { oauthOutcome, safeReturnPath } from '../../lib/auth';
import { isProvider } from '../../lib/providers';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  if (!supabaseWritable) {
    return redirect('/?auth=unavailable', 302);
  }

  const code = url.searchParams.get('code');
  const next = safeReturnPath(url.searchParams.get('next'));
  const linked = url.searchParams.get('linked') ?? '';
  const isLink = isProvider(linked);

  if (!code) {
    /*
      No code means the handshake ended somewhere other than success, and the parameters
      alongside it say where. Reading all of them as a cancellation is what made an
      approved Discord link come back claiming the reader had cancelled it, so the reason
      is classified rather than assumed, and written to the log either way: the reader gets
      the short version, and whoever has to fix it gets Supabase's own words.
    */
    const { outcome, detail } = oauthOutcome(url.searchParams);

    if (detail) {
      console.error(
        `[auth/callback] the ${isLink ? `${linked} link` : 'sign in'} came back without a code`,
        detail
      );
    }

    if (isLink) {
      return redirect(`/account/?link=${outcome}&provider=${linked}#connections`, 302);
    }

    /*
      A cancellation goes back where they were, because backing out of a sign in is a
      decision, not a fault, and there is nothing to say about it. A failure goes to the
      chooser with `next` still attached, so there is a page that can say something and a
      button to try again on. It used to go to /?auth=failed, which nothing on the site
      renders, so a sign in that broke looked exactly like one that never happened.
    */
    if (outcome === 'cancelled') return redirect(next, 302);

    return redirect(`/signin/?auth=failed&next=${encodeURIComponent(next)}`, 302);
  }

  const supabase = serverClient(cookies, request.headers);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('[auth/callback] the code could not be exchanged for a session', error);
    return redirect(
      isLink
        ? `/account/?link=failed&provider=${linked}#connections`
        : `/signin/?auth=failed&next=${encodeURIComponent(next)}`,
      302
    );
  }

  /*
    Refresh the fields the provider owns on every sign in. An avatar, a display name and
    a handle all change, and a profile that shows who somebody was two years ago is worse
    than one that shows nothing.

    Only the columns belonging to the provider they just used get touched. Somebody who
    signed in with GitHub last week and Discord today keeps their github_login, because
    the alternative is a profile that forgets half of itself every time its owner picks a
    different button.

    github_created_at is the one that matters most. It is what the new account hold in
    decision 16 reads, and only GitHub sends it. Discord and Twitch accounts fall back to
    the day the profile was made, which is the honest answer when the provider will not
    tell us anything better.
  */
  try {
    const meta = data.user.user_metadata ?? {};
    const provider = isLink ? linked : (data.user.app_metadata?.provider ?? '');

    /*
      A link attaches an identity. It is not a fresh introduction, so it leaves the name
      and the face alone: somebody who set a display name on /account/ should not lose it
      for connecting Twitch.
    */
    const patch: ProfileUpdate = isLink
      ? {}
      : {
          display_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
          avatar_url: (meta.avatar_url as string) ?? null
        };

    if (isProvider(provider)) {
      const identity = data.user.identities?.find((i) => i.provider === provider);
      const identityData = (identity?.identity_data ?? {}) as Record<string, unknown>;

      /*
        The user_metadata fallbacks are for a sign in only. On a link, that object still
        describes whoever this person signed up as, so falling back to it would copy a
        GitHub username into twitch_login and call the account linked when it is not.
        Better to write nothing and leave the row honest.
      */
      const rawId =
        (identityData.provider_id as string | number | undefined) ??
        (identityData.sub as string | undefined) ??
        (isLink ? undefined : (meta.provider_id as string | number | undefined));
      const providerId = rawId == null || rawId === '' ? null : String(rawId);

      const login =
        (
          (identityData.user_name as string | undefined) ??
          (identityData.preferred_username as string | undefined) ??
          (identityData.nickname as string | undefined) ??
          (isLink ? undefined : (meta.user_name as string | undefined)) ??
          ''
        ).toLowerCase() || null;

      const createdAt =
        (identityData.created_at as string | undefined) ??
        (isLink ? undefined : (meta.created_at as string | undefined));

      if (provider === 'github') {
        if (providerId) patch.github_id = Number(providerId);
        patch.github_login = login;
        if (createdAt) patch.github_created_at = createdAt;
      } else if (provider === 'discord') {
        if (providerId) patch.discord_id = providerId;
        patch.discord_login = login;
      } else {
        /*
          Signing in with Twitch is a link, so the badge backfill should see it. Without
          this, somebody whose way in is Twitch would have to walk through
          /auth/link/twitch/ to claim history they already proved they own.
        */
        if (providerId) {
          patch.twitch_user_id = providerId;
          patch.twitch_linked_at = new Date().toISOString();
        }
        patch.twitch_login = login;
      }
    }

    /*
      An update with no columns is a request PostgREST rejects, and there is nothing to
      say anyway. It happens when a link comes back for a provider whose identity is not
      in the response yet.
    */
    if (Object.keys(patch).length > 0) {
      const { error: writeError } = await serviceClient()
        .from('profiles')
        .update(patch)
        .eq('id', data.user.id);

      if (writeError) {
        console.error('[auth/callback] profile refresh failed', writeError);
      }
    }
  } catch (err) {
    /* A stale avatar is not a reason to refuse somebody entry. */
    console.error('[auth/callback] profile refresh threw', err);
  }

  return redirect(next, 302);
};
