/*
  Sign in.

  A GET, not a POST, so it works as a plain link from anywhere including a page that
  shipped no JavaScript. It hands off to the provider and comes back at /auth/callback/.

  `next` carries where the reader was, so signing in to leave a comment returns them to
  the comment box rather than to the front page. It is checked rather than trusted: an
  open redirect on a sign in route is how a phishing link borrows your domain.

  `provider` gets the same treatment. It is looked up in the table below rather than
  passed through, because handing a user supplied string to signInWithOAuth is how you
  end up supporting a provider you never configured.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseWritable } from '../../lib/supabase';
import { safeReturnPath } from '../../lib/auth';
import { PROVIDER_SCOPES, isProvider } from '../../lib/providers';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  if (!supabaseWritable) {
    return redirect('/?auth=unavailable', 302);
  }

  const next = safeReturnPath(url.searchParams.get('next'));
  const requested = url.searchParams.get('provider') ?? '';

  if (!isProvider(requested)) {
    /*
      Back to the chooser rather than quietly defaulting to GitHub. A missing provider
      means somebody followed a link written before there was a choice, and sending them
      somewhere they can pick is more use than signing them in as something they never
      asked for.
    */
    return redirect(`/signin/?next=${encodeURIComponent(next)}`, 302);
  }

  const supabase = serverClient(cookies, request.headers);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: requested,
    options: {
      redirectTo: new URL(`/auth/callback/?next=${encodeURIComponent(next)}`, url.origin).toString(),
      scopes: PROVIDER_SCOPES[requested]
    }
  });

  if (error || !data?.url) {
    return redirect('/?auth=failed', 302);
  }

  return redirect(data.url, 302);
};
