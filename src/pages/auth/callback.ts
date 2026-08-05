/*
  Where GitHub sends the reader back to.

  Exchanges the one time code for a session, sets the cookies, and returns them to
  wherever they were when they decided to sign in.

  The profile row is not created here. It is created by the on_auth_user_created trigger
  in the database, in the same transaction as the auth user, so there is no window in
  which somebody is signed in but has no profile. Doing it here would leave that window
  open every time this route failed halfway.
*/

import type { APIRoute } from 'astro';
import { serverClient, serviceClient, supabaseWritable } from '../../lib/supabase';
import { safeReturnPath } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  if (!supabaseWritable) {
    return redirect('/?auth=unavailable', 302);
  }

  const code = url.searchParams.get('code');
  const next = safeReturnPath(url.searchParams.get('next'));

  if (!code) {
    /* The reader pressed cancel on GitHub, or somebody hit this URL by hand. */
    return redirect(next, 302);
  }

  const supabase = serverClient(cookies, request.headers);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirect('/?auth=failed', 302);
  }

  /*
    Refresh the fields GitHub owns on every sign in. An avatar, a display name and a
    handle all change, and a profile that shows who somebody was two years ago is worse
    than one that shows nothing.

    github_created_at is the one that matters most. It is what the new account hold in
    decision 16 reads, and the trigger can only capture it if GitHub happened to include
    it in the identity payload, which is not guaranteed.
  */
  try {
    const meta = data.user.user_metadata ?? {};
    const identity = data.user.identities?.find((i) => i.provider === 'github');
    const identityData = (identity?.identity_data ?? {}) as Record<string, unknown>;

    const createdAt =
      (identityData.created_at as string | undefined) ?? (meta.created_at as string | undefined);

    await serviceClient()
      .from('profiles')
      .update({
        display_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
        avatar_url: (meta.avatar_url as string) ?? null,
        github_login: (meta.user_name as string) ?? null,
        github_id: meta.provider_id ? Number(meta.provider_id) : null,
        github_created_at: createdAt ?? null
      })
      .eq('id', data.user.id);
  } catch {
    /* A stale avatar is not a reason to refuse somebody entry. */
  }

  return redirect(next, 302);
};
