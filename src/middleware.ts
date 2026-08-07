/*
  Middleware.

  Puts the signed in person on Astro.locals so a page can ask who is reading it without
  every page repeating the cookie dance.

  It runs on rendered routes only. Static pages are built once with nobody signed in, so
  locals.profile is null there and always will be, which is exactly right: a page that
  ships to a CDN cannot know who is looking at it. Anything that changes with the reader
  is an island asking an API route, not server rendered markup.
*/

import { defineMiddleware } from 'astro:middleware';
import { serverClient, serviceClient, supabaseWritable } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.profile = null;
  context.locals.userId = null;

  /* Prerendered routes are built with no reader, so there is nothing to look up. */
  if (!supabaseWritable || context.isPrerendered) {
    return next();
  }

  try {
    const supabase = serverClient(context.cookies, context.request.headers);

    /*
      getUser rather than getSession. getSession reads the cookie and believes it.
      getUser asks the auth server, which is the difference between "this cookie claims
      to be somebody" and "this is somebody".
    */
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      context.locals.userId = user.id;

      /*
        Service role, not the visitor's client above.

        Reading it as the visitor is the more obvious shape and is what was here first,
        but 20260805000000_base_table_grants.sql revokes every table privilege in public
        from anon and authenticated, on the stated grounds that no serverClient call has
        a .from on it. This was the one that did. The select came back permission denied
        instead of a row, only data was destructured so the error went nowhere, and a
        signed in reader looked signed out to every route that gates on locals.profile.

        Nothing else in the site reads profiles as the visitor either. The OAuth callback
        updates this same row through serviceClient. The id comes from getUser above,
        which the auth server verified, so this is one row belonging to a known person.
      */
      const { data, error } = await serviceClient()
        .from('profiles')
        .select('id, handle, display_name, avatar_url, is_private, github_created_at, created_at')
        .eq('id', user.id)
        .maybeSingle();

      /* Staying quiet here is indistinguishable from a signed out reader, which is the
         whole reason the grant defect above was so hard to see. */
      if (error) {
        console.error(`Could not read the profile for signed in user ${user.id}: ${error.message}`);
      }

      context.locals.profile = data ?? null;
    }
  } catch (err) {
    /*
      A signed out reader is the normal case, and an auth server having a bad minute
      should not take the page down with it. Either way the page renders signed out.
    */
    console.error('Auth lookup failed, rendering signed out:', err);
  }

  return next();
});
