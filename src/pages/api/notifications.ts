/*
  Draining the email queue.

  Nothing on the site calls this. It is called on a timer, by pg_cron through net.http_post
  or by a Netlify scheduled function, whichever is cheaper to keep alive. The endpoint
  exists rather than the drain living in a database function because these emails are
  rendered from the same content helpers the pages use, and rebuilding that in SQL would
  guarantee the email and the page eventually disagree about a URL.

  Guarded by a shared secret rather than a session, because the caller is a machine. Set
  NOTIFY_SECRET, send it as a bearer token. With no secret set the route refuses
  everything: an unguarded endpoint that sends mail is worse than one that never runs.

  Timing safe comparison, because a secret checked with === leaks its length and then its
  bytes to anybody patient enough to measure, and this is a route somebody can hit as
  often as they like.
*/

import { timingSafeEqual } from 'node:crypto';
import type { APIRoute } from 'astro';
import { drain } from '../../lib/notifications';

export const prerender = false;

const SECRET = import.meta.env.NOTIFY_SECRET;

function authorised(header: string | null): boolean {
  if (!SECRET) return false;
  if (!header?.startsWith('Bearer ')) return false;

  const given = new TextEncoder().encode(header.slice(7));
  const want = new TextEncoder().encode(SECRET);

  /* Lengths differ, so there is nothing to compare in constant time. Say no. */
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

export const POST: APIRoute = async (context) => {
  if (!authorised(context.request.headers.get('authorization'))) {
    return new Response('no', { status: 404 });
  }

  const result = await drain();

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
