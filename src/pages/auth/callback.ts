/*
  Where the provider sends the reader back to.

  Exchanges the one time code for a session, sets the cookies, and returns them to
  wherever they were when they decided to sign in.

  The profile row is not created here. It is created by the on_auth_user_created trigger
  in the database, in the same transaction as the auth user, so there is no window in
  which somebody is signed in but has no profile. Doing it here would leave that window
  open every time this route failed halfway.
*/

import type { APIRoute } from 'astro';
import { serverClient, serviceClient, supabaseWritable } from '../../lib/supabase';
import type { Database } from '../../lib/supabase/database.types';
import { safeReturnPath } from '../../lib/auth';
import { isProvider } from '../../lib/providers';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  if (!supabaseWritable) {
    return redirect('/?auth=unavailable', 302);
  }

  const code = url.searchParams.get('code');
  const next = safeReturnPath(url.searchParams.get('next'));

  if (!code) {
    /* The reader pressed cancel on the provider, or somebody hit this URL by hand. */
    return redirect(next, 302);
  }

  const supabase = serverClient(cookies, request.headers);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirect('/?auth=failed', 302);
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
    const provider = data.user.app_metadata?.provider ?? '';

    const patch: ProfileUpdate = {
      display_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
      avatar_url: (meta.avatar_url as string) ?? null
    };

    if (isProvider(provider)) {
      const identity = data.user.identities?.find((i) => i.provider === provider);
      const identityData = (identity?.identity_data ?? {}) as Record<string, unknown>;

      const rawId =
        (identityData.provider_id as string | number | undefined) ??
        (identityData.sub as string | undefined) ??
        (meta.provider_id as string | number | undefined);
      const providerId = rawId == null || rawId === '' ? null : String(rawId);

      const login =
        (
          (identityData.user_name as string | undefined) ??
          (identityData.preferred_username as string | undefined) ??
          (identityData.nickname as string | undefined) ??
          (meta.user_name as string | undefined) ??
          ''
        ).toLowerCase() || null;

      const createdAt =
        (identityData.created_at as string | undefined) ?? (meta.created_at as string | undefined);

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

    const { error: writeError } = await serviceClient()
      .from('profiles')
      .update(patch)
      .eq('id', data.user.id);

    if (writeError) {
      console.error('[auth/callback] profile refresh failed', writeError);
    }
  } catch (err) {
    /* A stale avatar is not a reason to refuse somebody entry. */
    console.error('[auth/callback] profile refresh threw', err);
  }

  return redirect(next, 302);
};
