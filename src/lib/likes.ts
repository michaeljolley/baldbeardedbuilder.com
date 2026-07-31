/*
  Likes.

  Decision 11: anonymous, no sign in, deduped by browser token plus hashed address,
  attributed when somebody happens to be signed in.

  The dedupe key is the pair, not the address alone. A strict unique on ip_hash would mean
  the first person behind an office or a household router gets to like a thing and
  everybody else behind that same address is told they already did. The pair keeps the
  block that matters, which is one browser hammering the button, without punishing people
  for sharing a connection.

  How a reader is identified lives in reader.ts. This file is only the queries.
*/

import { serviceClient, supabaseWritable } from './supabase';
import { hashIp, isLikeTarget, LIKE_TARGETS, type LikeTarget } from './reader';

export type { TargetKind, LikeTarget } from './reader';
export { isTargetKind, isLikeTarget, isTargetKey, browserToken, clientIp, hashIp, TOKEN_COOKIE } from './reader';

export interface LikeState {
  likes: number;
  liked: boolean;
}

export async function readLike(
  kind: LikeTarget,
  key: string,
  token: string
): Promise<LikeState> {
  if (!supabaseWritable) return { likes: 0, liked: false };

  const db = serviceClient();

  const [{ count }, { data: mine }] = await Promise.all([
    db
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('target_kind', kind)
      .eq('target_key', key),
    db
      .from('likes')
      .select('id')
      .eq('target_kind', kind)
      .eq('target_key', key)
      .eq('browser_token', token)
      .maybeSingle()
  ]);

  return { likes: count ?? 0, liked: Boolean(mine) };
}

/**
 * Adds a like, or removes it if this browser already left one.
 *
 * A toggle rather than an add, because a control that cannot be undone is a control
 * people are afraid to press.
 */
export async function toggleLike(
  kind: LikeTarget,
  key: string,
  token: string,
  ip: string,
  profileId: string | null
): Promise<LikeState> {
  if (!supabaseWritable) return { likes: 0, liked: false };

  const db = serviceClient();

  const { data: existing } = await db
    .from('likes')
    .select('id')
    .eq('target_kind', kind)
    .eq('target_key', key)
    .eq('browser_token', token)
    .maybeSingle();

  if (existing) {
    await db.from('likes').delete().eq('id', existing.id);
  } else {
    /*
      Ignoring the error rather than reporting it. The only way this fails is the unique
      index firing, which means this browser and address already liked this thing, which
      is the state the reader was asking for anyway. Telling them it went wrong when the
      outcome is what they wanted would be a lie about a success.
    */
    await db.from('likes').insert({
      target_kind: kind,
      target_key: key,
      browser_token: token,
      ip_hash: hashIp(ip),
      profile_id: profileId
    });
  }

  return readLike(kind, key, token);
}

/*
  Every count on the site, read once per build and grouped by kind.

  Decision 32 keeps content pages at zero JavaScript, so a number printed on a card is a
  build time snapshot and is honestly approximate. Only the single control on a detail
  page reads and writes live, and it reconciles the moment it hydrates.

  Read in one query rather than one per page. There are over a hundred and fifty pages and
  the whole table is three columns, so a page at a time would be a hundred and fifty round
  trips to save a few kilobytes of memory.
*/
let allCounts: Map<LikeTarget, Map<string, number>> | null = null;

async function loadCounts(): Promise<Map<LikeTarget, Map<string, number>>> {
  if (allCounts) return allCounts;

  const built = new Map<LikeTarget, Map<string, number>>();
  for (const kind of LIKE_TARGETS) built.set(kind, new Map());

  if (supabaseWritable) {
    const { data } = await serviceClient()
      .from('like_counts')
      .select('target_kind, target_key, likes');

    for (const row of data ?? []) {
      if (!isLikeTarget(row.target_kind) || !row.target_key) continue;
      built.get(row.target_kind)!.set(row.target_key, Number(row.likes ?? 0));
    }
  }

  allCounts = built;
  return built;
}

/** Every count for one kind, keyed by target. Empty when Supabase is not configured. */
export async function bakedLikes(kind: LikeTarget): Promise<Map<string, number>> {
  return (await loadCounts()).get(kind)!;
}

/** One count, for a page that only needs its own. */
export async function bakedLike(kind: LikeTarget, key: string): Promise<number> {
  return (await bakedLikes(kind)).get(key) ?? 0;
}
