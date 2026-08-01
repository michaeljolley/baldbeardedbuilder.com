/*
  The share intent endpoint.

  POST only. There is nothing to read here: no count is ever shown to a reader, because
  decision 122 makes this Michael's number rather than social proof. A GET would exist
  only to turn it into social proof by accident.

  It is an unauthenticated write, so it carries the same rate limiting shape as
  /api/like. An open counter endpoint is an open counter endpoint whatever it counts.

  It answers 204 with no body. The island sends this with sendBeacon and cannot read a
  response, so a body would be written for nobody.
*/

import type { APIRoute } from 'astro';
import { clientIp, hashIp, isTargetKey, isTargetKind } from '../../lib/reader';
import { isSharePlatform } from '../../lib/share-links';
import { serviceClient, supabaseWritable } from '../../lib/supabase';
import type { PendingDatabase } from '../../lib/supabase/pending.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const prerender = false;

/*
  A hundred and twenty intents an hour from one address.

  Higher than the like limit because a person can legitimately press this several times on
  one page. They might post to two platforms and then copy the link anyway, and a menu
  that opens a popup blocked window invites a second press. Low enough that a script
  cannot inflate a platform comparison to the point of changing what Michael writes next.

  Counted per hashed address rather than per browser token, for the reason written out at
  length in like.ts: the token is the thing a script can forge freely.
*/
const INTENTS_PER_HOUR = 120;

export const POST: APIRoute = async (context) => {
  /*
    204 rather than 503 when there is no database.

    /api/like answers 503 because a reader is waiting on a number that did not move. Here
    nobody is waiting and nothing is shown, so reporting a failure would only put a red
    line in a console for a reader who did nothing wrong.
  */
  if (!supabaseWritable) return new Response(null, { status: 204 });

  let payload: { kind?: unknown; key?: unknown; platform?: unknown };
  try {
    payload = await context.request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { kind, key, platform } = payload;
  if (!isTargetKind(kind) || !isTargetKey(key) || !isSharePlatform(platform)) {
    return new Response(null, { status: 400 });
  }

  /* See supabase/pending.types.ts. The cast goes when the types can be generated. */
  const db = serviceClient() as unknown as SupabaseClient<PendingDatabase>;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ipHash = hashIp(clientIp(context));

  const { count } = await db
    .from('share_intents')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if ((count ?? 0) >= INTENTS_PER_HOUR) return new Response(null, { status: 429 });

  await db.from('share_intents').insert({
    target_kind: kind,
    target_key: key,
    platform,
    ip_hash: ipHash
  });

  return new Response(null, { status: 204 });
};
