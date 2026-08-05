/*
  Dev disasters.

  Published submissions live in Supabase and reach the site through the build hook in
  decision 23, so at build time this is a read of published rows.

  It used to be a read of src/config/disasters.seed.json, sixteen written rows that let
  the pages be built and looked at before there was a database. That file is gone, and
  the gap it was hiding is worth naming because it was invisible while it existed: the
  submit API inserted into disasters, the account page and the profile page read back out
  of it, and the wall read the JSON, so a real submission could be accepted, published,
  and shown to its own author on their own profile while never appearing on the site.
  Nothing would have errored. Every page would have rendered. The story simply would not
  have been there.

  A disaster never belongs to a topic. Severity and its id are the whole taxonomy.
*/

import { SEVERITIES, type SeverityId } from '../config/site';
import { bakedLikes } from './likes';
import { bakedRepliesFor } from './comments';
import { serviceClient, supabaseWritable } from './supabase';
import {
  authorIdsToResolve,
  shapeDisasters,
  tellersFromProfiles,
  type Disaster,
  type DisasterRow,
  type ProfileRow,
  type Teller
} from './disaster-rows';

/*
  The row shaping lives in ./disaster-rows, which imports nothing but types so that a test
  can run it. What is left here is the part that genuinely needs a database: the two
  queries, their error handling, and the module level read.
*/
export type { Teller, Disaster } from './disaster-rows';

const SEVERITY_IDS = SEVERITIES.map((s) => s.id) as readonly string[];

/*
  Everything the wall needs, read once at module load rather than per page.

  Top level await so that allDisasters stays synchronous. Every page on the site calls it,
  several of them inside getStaticPaths, and turning it async would push the await into a
  dozen call sites for no gain.

  Likes and replies are counted rather than stored on the row. The count is real in both
  places it appears, which is the point: a card on the wall saying eleven and its own
  detail page saying nothing would read as a broken site. Both read zero until somebody
  turns up, which on an empty comments table is the truth.
*/
const likesById = await bakedLikes('disaster');
const repliesById = await bakedRepliesFor('disaster');

/**
 * Handles for the stories that are not anonymous.
 *
 * A second query rather than a PostgREST embed. The embed would be one round trip instead
 * of two, and at build time on a table this size that saving is not worth depending on a
 * relationship name that cannot be checked without a live database in front of you.
 *
 * Decision 104. This runs through serviceClient(), which bypasses RLS by design, so the
 * select asks for the two visibility columns and tellersFromProfiles restates the rule the
 * database would otherwise apply. Do not drop is_private and deleted_at from this select
 * as unused. They are what the restatement reads.
 */
async function tellersFor(rows: DisasterRow[]): Promise<Map<string, Teller>> {
  const ids = authorIdsToResolve(rows);
  if (ids.length === 0) return new Map();

  const { data, error } = await serviceClient()
    .from('profiles')
    .select('id, handle, is_private, deleted_at')
    .in('id', ids);

  /*
    Same reasoning as the read below. Swallowing this would draw every named story as
    anonymous over a healthy database, which misreports what every one of those people
    chose, and it would do it without a mark anywhere.
  */
  if (error) throw new Error(`Could not read profiles for dev disaster bylines: ${error.message}`);

  return tellersFromProfiles((data ?? []) as unknown as ProfileRow[]);
}

async function load(): Promise<Disaster[]> {
  /*
    No keys means no stories, not a failed build. A contributor with a fresh clone gets a
    working site with the social parts quiet, which is the same rule the rest of the
    Supabase layer follows. It is also the state of the site until the v2 project exists.
  */
  if (!supabaseWritable) return [];

  const { data, error } = await serviceClient()
    .from('disasters')
    .select('id, slug, severity, title, line, body, is_anonymous, author_id, published_at, featured_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  /*
    A read failure is not an empty wall. Returning [] here would draw "Nobody has told me
    theirs yet" over a database full of stories, and it would do it silently, so the site
    would look deliberately empty rather than broken. This is the one case worth stopping
    the build for, because every other outcome publishes a lie.
  */
  if (error) throw new Error(`Could not read published dev disasters: ${error.message}`);

  const rows = (data ?? []) as unknown as DisasterRow[];
  const tellers = await tellersFor(rows);

  return shapeDisasters(rows, tellers, {
    severityIds: SEVERITY_IDS,
    likesById,
    repliesById
  });
}

const rows = await load();

export function allDisasters(): Disaster[] {
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
