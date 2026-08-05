/*
  Sign out.

  POST only. A GET would mean any image tag on any page could sign a reader out, which is
  a small piece of griefing that costs nothing to prevent. The control that calls it is a
  real form, so it works without JavaScript.
*/

import type { APIRoute } from 'astro';
import { serverClient, supabaseConfigured } from '../../lib/supabase';
import { safeReturnPath } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData().catch(() => null);
  const next = safeReturnPath(form?.get('next')?.toString() ?? '/');

  if (supabaseConfigured) {
    try {
      await serverClient(cookies, request.headers).auth.signOut();
    } catch {
      /* Fall through and clear the cookies anyway. */
    }
  }

  return redirect(next, 303);
};
