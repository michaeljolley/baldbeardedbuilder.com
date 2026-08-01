/*
  Dev disasters.

  Approved submissions live in Supabase and reach the site through the build hook in
  decision 23, so at build time this is a read of published rows. That read lands in
  phase four. Until then the same shape is served from a seed file, which keeps the
  pages honest rather than stubbed and means the swap is one function body.

  A disaster never belongs to a topic. Severity and its id are the whole taxonomy.
*/

import seed from '../config/disasters.seed.json';
import { SEVERITIES, type SeverityId } from '../config/site';
import { bakedLikes } from './likes';
import { bakedRepliesFor } from './comments';

export interface Disaster {
  /** Sequential, shown as the diagnostic code. Stable, never reused. */
  id: number;
  slug: string;
  url: string;
  severity: SeverityId;
  /** AI written on submit, editable in Studio. Reads as a label, not a headline. */
  title: string;
  /** The line people remember. This is the headline on the wall and in the panel. */
  line: string;
  /** GitHub handle, or null when told anonymously. */
  teller: string | null;
  likes: number;
  replies: number;
  date: Date;
  /*
    When Michael put this on the front page, or null. A real act rather than a side effect
    of being newest, which is what lets the front page lead on a choice.

    In Supabase it is disasters.featured_at, set by hand in Studio. Two live things hang
    off it: the front page lead, which takes most recently featured and falls back to
    newest, and the Featured badge, granted by its own trigger on the null to not null
    transition.

    Decision 15's story_featured email also keyed off it, and this comment used to say so
    as though that were the reason it exists. That email is parked, per
    docs/notifications.md, and the column outlived it. Both remaining uses work with the
    entire email path inert.
  */
  featuredAt: Date | null;
  /** Story paragraphs. Plain prose, no markup. */
  body: string[];
}

interface SeedRow {
  id: number;
  slug: string;
  severity: string;
  title: string;
  line: string;
  teller: string | null;
  published: string;
  featured?: string;
  body: string[];
}

const SEVERITY_IDS = SEVERITIES.map((s) => s.id) as readonly string[];

/*
  Like and reply counts are read once here, at module load, rather than per page.

  Top level await so that allDisasters stays synchronous. Every page on the site calls it,
  several of them inside getStaticPaths, and turning it async would push the await into a
  dozen call sites for no gain. The count is real in both places it appears, which is the
  point: a card on the wall saying eleven and its own detail page saying nothing would
  read as a broken site.

  Neither number lives in the seed file. A seeded reply count is a claim that a
  conversation happened, and on a site with an empty comments table no conversation has.
  Both read zero until somebody turns up, which is the truth.
*/
const likesById = await bakedLikes('disaster');
const repliesById = await bakedRepliesFor('disaster');

let cache: Disaster[] | null = null;

export function allDisasters(): Disaster[] {
  if (cache) return cache;

  const rows = (seed.disasters as SeedRow[]).map((r) => {
    if (!SEVERITY_IDS.includes(r.severity)) {
      throw new Error(`Disaster ${r.id} has severity "${r.severity}", which is not one of ${SEVERITY_IDS.join(', ')}`);
    }
    return {
      id: r.id,
      slug: r.slug,
      url: `/dev-disasters/${r.slug}/`,
      severity: r.severity as SeverityId,
      title: r.title,
      line: r.line,
      teller: r.teller,
      likes: likesById.get(String(r.id)) ?? 0,
      replies: repliesById.get(String(r.id)) ?? 0,
      date: new Date(r.published),
      featuredAt: r.featured ? new Date(r.featured) : null,
      body: r.body
    } satisfies Disaster;
  });

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  cache = rows;
  return rows;
}

/**
 * The story on the front page.
 *
 * Most recently featured, falling back to newest when nothing has been featured yet,
 * which is the state on day one. Before this existed the lead was simply the newest row,
 * so nobody was ever chosen and the "your story is on the front page" email described
 * something that could not happen.
 *
 * Undefined when nothing has been published. The front page draws an invitation in that
 * case rather than a story, so this returns the absence rather than inventing a lead.
 */
export function leadDisaster(): Disaster | undefined {
  const rows = allDisasters();
  const featured = rows
    .filter((d) => d.featuredAt)
    .sort((a, b) => b.featuredAt!.getTime() - a.featuredAt!.getTime());
  return featured[0] ?? rows[0];
}

export type DisasterSort = 'liked' | 'replies' | 'newest';
export function sortDisasters(rows: Disaster[], sort: DisasterSort): Disaster[] {
  const out = [...rows];
  if (sort === 'liked') out.sort((a, b) => b.likes - a.likes);
  else if (sort === 'replies') out.sort((a, b) => b.replies - a.replies);
  else out.sort((a, b) => b.date.getTime() - a.date.getTime());
  return out;
}

export function countsBySeverity(): Record<SeverityId | 'all', number> {
  const rows = allDisasters();
  const out = { all: rows.length } as Record<SeverityId | 'all', number>;
  for (const s of SEVERITIES) out[s.id] = rows.filter((r) => r.severity === s.id).length;
  return out;
}

/** The three word summary the panel bar shows on the front page. */
export function problemSummary(): string {
  const c = countsBySeverity();
  const other = c.all - c.error - c.warning;
  return `${c.error} errors, ${c.warning} warnings, ${other} other`;
}

export function disasterBySlug(slug: string): Disaster | undefined {
  return allDisasters().find((d) => d.slug === slug);
}

/** Three digits is what the mockup draws, and what a diagnostic code looks like. */
export function disasterCode(id: number): string {
  return String(id).padStart(3, '0');
}
