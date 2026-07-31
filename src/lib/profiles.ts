/*
  Reading a builder profile.

  One function, because a profile page is one round trip's worth of questions and
  splitting them across five exported helpers would turn it into five.

  Everything here degrades. If Supabase is not configured, or the profile does not exist,
  or it is private, the caller gets null and renders a 404. A private profile and a
  missing profile return the same thing on purpose: "this person has gone private" is
  itself information about a person who asked not to be findable.
*/

import { serviceClient, supabaseWritable } from './supabase';
import type { SeverityId } from '../config/site';

export interface ShelfBadge {
  id: string;
  family: string | null;
  tier: number | null;
  name: string;
  description: string;
  category: 'presence' | 'craft' | 'care';
  tone: SeverityId;
  earned: boolean;
  /** Roman numeral for tiered families, null for a badge that has only one step. */
  numeral: string | null;
}

export interface ProfileDisaster {
  id: number;
  slug: string;
  severity: SeverityId;
  line: string;
  likes: number;
}

export interface BuilderProfile {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  links: { label: string; url: string }[];
  githubLogin: string | null;
  twitchLinked: boolean;
  joined: Date;
  stats: {
    disasters: number;
    likesReceived: number;
    comments: number;
    streamsWatched: number;
  };
  badges: ShelfBadge[];
  disasters: ProfileDisaster[];
}

const NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function numeral(tier: number | null, familySize: number): string | null {
  /* A family with one step does not need a numeral. "Featured I" reads as a mistake. */
  if (!tier || familySize < 2) return null;
  return NUMERALS[tier] ?? String(tier);
}

export async function getBuilderProfile(handle: string): Promise<BuilderProfile | null> {
  if (!supabaseWritable) return null;

  let db;
  try {
    db = serviceClient();
  } catch {
    return null;
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id, handle, display_name, avatar_url, bio, links, github_login, twitch_user_id, twitch_login, created_at, is_private, deleted_at')
    .eq('handle', handle)
    .maybeSingle();

  if (!profile || profile.is_private || profile.deleted_at) return null;

  const [grants, shelf, disasters, commentCount, streamCount, firstSeen] = await Promise.all([
    db.from('badge_grants').select('badge_id').eq('profile_id', profile.id),
    db.from('badge_shelf').select('badge_id, family, tier, name, description, category, tone, sort_order'),
    db
      .from('disasters')
      .select('id, slug, severity, line')
      .eq('author_id', profile.id)
      .eq('status', 'published')
      .eq('is_anonymous', false)
      .order('published_at', { ascending: false }),
    db
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('status', 'visible'),
    /*
      Streams watched comes from the Twitch history, which is keyed by login rather than
      by profile. Only a linked account has an honest number here, and an unlinked one
      gets zero rather than a guess.

      This has to be an RPC because the number wanted is distinct stream days, not row
      count. One talkative evening is hundreds of rows and is still one stream, so a plain
      count would inflate the figure by an order of magnitude or two.
    */
    profile.twitch_login
      ? db.rpc('streams_watched', { p_login: profile.twitch_login })
      : Promise.resolve({ data: 0 }),
    /*
      An honest joined date.

      profiles.created_at is the day somebody first signed in to v2, which for everybody
      is going to be launch week. A linked Twitch account carries a better answer, so it
      wins when it exists.
    */
    profile.twitch_login
      ? db.rpc('twitch_first_seen', { p_login: profile.twitch_login })
      : Promise.resolve({ data: null })
  ]);

  const earned = new Set((grants.data ?? []).map((g) => g.badge_id));

  const familySizes = new Map<string, number>();
  for (const row of shelf.data ?? []) {
    if (!row.family) continue;
    familySizes.set(row.family, (familySizes.get(row.family) ?? 0) + 1);
  }

  /*
    Every column on a view comes back nullable, because Postgres will not promise a view
    preserves not-null. The rows are all real, so this filter is a type narrowing rather
    than a data check, but it is the honest way to say so.
  */
  const badges: ShelfBadge[] = (shelf.data ?? [])
    .filter((row) => row.badge_id && row.name && row.description)
    .map((row) => ({
      id: row.badge_id!,
      family: row.family,
      tier: row.tier,
      name: row.name!,
      description: row.description!,
      category: row.category as ShelfBadge['category'],
      tone: row.tone as SeverityId,
      earned: earned.has(row.badge_id!),
      numeral: numeral(row.tier, familySizes.get(row.family ?? '') ?? 1)
    }))
    .sort((a, b) => Number(b.earned) - Number(a.earned));

  const rows = disasters.data ?? [];
  const ids = rows.map((r) => String(r.id));

  const { data: likeRows } = ids.length
    ? await db.from('like_counts').select('target_key, likes').eq('target_kind', 'disaster').in('target_key', ids)
    : { data: [] };

  const likeByKey = new Map((likeRows ?? []).map((r) => [r.target_key, Number(r.likes)]));

  const list: ProfileDisaster[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug ?? '',
    severity: r.severity as SeverityId,
    line: r.line ?? '',
    likes: likeByKey.get(String(r.id)) ?? 0
  }));

  return {
    handle: profile.handle,
    displayName: profile.display_name || profile.handle,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    links: normaliseLinks(profile.links),
    githubLogin: profile.github_login,
    twitchLinked: Boolean(profile.twitch_user_id),
    joined: firstSeen.data ? new Date(String(firstSeen.data)) : new Date(profile.created_at),
    stats: {
      disasters: list.length,
      likesReceived: list.reduce((sum, d) => sum + d.likes, 0),
      comments: commentCount.count ?? 0,
      streamsWatched: streamCount.data ?? 0
    },
    badges,
    disasters: list
  };
}

/*
  Links are user supplied jsonb, so nothing about their shape is guaranteed. Anything
  that is not an http or https URL with a label is dropped rather than rendered, which
  also closes the javascript: URL that a stricter type would have let through.
*/
function normaliseLinks(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const { label, url } = entry as Record<string, unknown>;
    if (typeof label !== 'string' || typeof url !== 'string') return [];

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return [];
      return [{ label: label.slice(0, 40), url: parsed.toString() }];
    } catch {
      return [];
    }
  });
}

/** Two letters for the avatar fallback, which is what the mockup draws. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
