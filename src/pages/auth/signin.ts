/*
  Sign in.

  A GET, not a POST, so it works as a plain link from anywhere including a page that
  shipped no JavaScript. It hands off to GitHub and comes back at /auth/callback.

  `next` carries where the reader was, so signing in to leave a comment returns them to
  the comment box rather than to the front page. It is checked rather than trusted: an
  open redirect on a sign in route is how a phishing link borrows your domain.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseWritable } from '../../lib/supabase';
import { safeReturnPath } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  if (!supabaseWritable) {
    return redirect('/?auth=unavailable', 302);
  }

  const next = safeReturnPath(url.searchParams.get('next'));
  const supabase = serverClient(cookies, request.headers);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: new URL(`/auth/callback?next=${encodeURIComponent(next)}`, url.origin).toString(),
      /*
        Decision 4 wants a sign in, not an integration. read:user is what the profile
        needs and user:email is what a notification needs somewhere to go. Nothing here
        can read a repository.
      */
      scopes: 'read:user user:email'
    }
  });

  if (error || !data?.url) {
    return redirect('/?auth=failed', 302);
  }

  return redirect(data.url, 302);
};
