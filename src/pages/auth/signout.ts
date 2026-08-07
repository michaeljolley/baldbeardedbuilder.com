/*
  Sign out.

  POST only. A GET would mean any image tag on any page could sign a reader out, which is
  a small piece of griefing that costs nothing to prevent. The control that calls it is a
  real form, so it works without JavaScript.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseConfigured } from '../../lib/supabase';
import { clearSession, safeReturnPath } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, cookies, redirect } = context;
  const form = await request.formData().catch(() => null);
  const next = safeReturnPath(form?.get('next')?.toString() ?? '/');

  if (supabaseConfigured) {
    try {
      /*
        Scope 'local' rather than the default 'global'. Signing out here should end this
        browser's session, not every session on every device the same person is signed in
        on, which is what pressing sign out on a shared laptop would otherwise do to their
        phone.
      */
      await serverClient(cookies, request.headers).auth.signOut({ scope: 'local' });
    } catch {
      /* Fall through and clear the cookies anyway. */
    }
  }

  /*
    And clear them regardless. signOut writes the removals through the same cookie
    adapter, so this is usually a no op, but it is a network call to the auth server and
    network calls fail. A browser still holding an sb- cookie after pressing sign out
    renders as signed in until the token expires, which is the single outcome this button
    exists to prevent.
  */
  clearSession(context);

  return redirect(next, 303);
};
