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
import { serverClient, supabaseWritable } from './lib/supabase';

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

      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url, is_private')
        .eq('id', user.id)
        .maybeSingle();

      context.locals.profile = data ?? null;
    }
  } catch {
    /*
      A signed out reader is the normal case, and an auth server having a bad minute
      should not take the page down with it. Either way the page renders signed out.
    */
  }

  return next();
});
