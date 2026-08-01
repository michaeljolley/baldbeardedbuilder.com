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

interface Row {
  id: number;
  slug: string | null;
  severity: string;
  title: string | null;
  line: string | null;
  body: string | null;
  is_anonymous: boolean;
  author_id: string | null;
  published_at: string | null;
  featured_at: string | null;
}

const SEVERITY_IDS = SEVERITIES.map((s) => s.id) as readonly string[];

/**
 * Prose as typed, split into paragraphs.
 *
 * The column is one text field because that is what somebody typed into one textarea.
 * Blank lines are where they chose to break it. A story with no blank lines is one
 * paragraph, which is a real way to write a short one and not a defect to repair.
 */
function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

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
 */
async function tellersFor(rows: Row[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.filter((r) => !r.is_anonymous && r.author_id).map((r) => r.author_id!))];
  if (ids.length === 0) return new Map();

  const { data } = await serviceClient().from('profiles').select('id, handle').in('id', ids);
  return new Map((data ?? []).map((p) => [p.id as string, p.handle as string]));
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

  const rows = (data ?? []) as unknown as Row[];
  const tellers = await tellersFor(rows);

  const out: Disaster[] = [];

  for (const r of rows) {
    /*
      Skip and warn rather than throw.

      Against the old seed file a bad severity could only mean somebody had mistyped it in
      this repo, so throwing failed the build of the person holding the fix. Against a
      database the row is somebody else's, written through Studio or the submit API, and
      the check constraint on the column already rejects a value the schema does not know.
      What is left is drift between that constraint and SEVERITIES here, and taking the
      whole site down over one row the site cannot draw is a blast radius wildly out of
      proportion to the fault. So the row is dropped and the reason is printed with its id,
      which is enough to find it. Drawing it under a substituted severity would be worse
      than either, because it would invent a classification for somebody else's story.
    */
    if (!SEVERITY_IDS.includes(r.severity)) {
      console.warn(
        `Dev disaster ${r.id} has severity "${r.severity}", which is not one of ` +
          `${SEVERITY_IDS.join(', ')}. Left off the site.`
      );
      continue;
    }

    /*
      disasters_published_is_complete already guarantees these on a published row, so this
      is the same drift guard one level down: it holds if that constraint is ever relaxed.
      A story with no slug has nowhere to live, and one with no line has nothing to say on
      the wall, so neither can be drawn.
    */
    if (!r.slug || !r.title || !r.line || !r.body || !r.published_at) {
      console.warn(`Dev disaster ${r.id} is published but incomplete. Left off the site.`);
      continue;
    }

    out.push({
      id: r.id,
      slug: r.slug,
      url: `/dev-disasters/${r.slug}/`,
      severity: r.severity as SeverityId,
      title: r.title,
      line: r.line,
      teller: r.is_anonymous ? null : (tellers.get(r.author_id ?? '') ?? null),
      likes: likesById.get(String(r.id)) ?? 0,
      replies: repliesById.get(String(r.id)) ?? 0,
      date: new Date(r.published_at),
      featuredAt: r.featured_at ? new Date(r.featured_at) : null,
      body: paragraphs(r.body)
    });
  }

  out.sort((a, b) => b.date.getTime() - a.date.getTime());
  return out;
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
