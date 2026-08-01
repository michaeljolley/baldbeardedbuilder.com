/*
  Turning dev disaster rows into things the site can draw.

  This is a leaf module and the split is the point of it.

  Everything below the query in disasters.ts had never run. `load()` opens with
  `if (!supabaseWritable) return []`, there are no v2 keys yet, so that early return is the
  only branch any test, build or accessibility gate has ever taken. The severity guard, the
  incomplete row guard, the privacy predicate that closed occurrence fifteen, the byline
  rule that keeps a failed lookup distinct from a stated choice: all of it was asserted by
  reading source and none of it by running.

  None of that needs a database. It needs rows. So the parts that are a function of rows
  live here, where a test can hand them rows, and disasters.ts keeps the parts that are a
  function of the network. What is still unexecuted after this is the query itself and the
  shape Supabase returns, which genuinely does need the project ref.

  Nothing is imported here but types, deliberately. disasters.ts has top level await and
  imports ./supabase, which is a directory, so importing it from a test fails before any
  assertion runs. Severity ids arrive as an argument rather than from ../config/site for
  the same reason, and it makes the drift they guard against directly testable.
*/

import type { SeverityId } from '../config/site';

/**
 * Who told a story, and what the byline is allowed to say about them.
 *
 * A discriminated union rather than a nullable handle, because null was carrying three
 * meanings and only two of them are decisions. Somebody chose to tell it anonymously,
 * somebody went private or deleted their account, and the lookup failed. The first two
 * render identically and the third must not, since drawing "anonymous" over a failed
 * lookup states something false about a person's stated choice and is indistinguishable
 * from them having made it.
 *
 * `why` is kept even though nothing branches on it today. The distinction is the reason
 * this type exists, so collapsing it back to a boolean would undo the fix quietly.
 */
export type Teller =
  | { shown: 'handle'; handle: string }
  | { shown: 'anonymous'; why: 'chosen' | 'private' }
  | { shown: 'nothing' };

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
  /** Who the byline names, or why it does not. */
  teller: Teller;
  likes: number;
  replies: number;
  date: Date;
  /** When Michael put this on the front page, or null. A real act, not a side effect. */
  featuredAt: Date | null;
  /** Story paragraphs. Plain prose, no markup. */
  body: string[];
}

export interface DisasterRow {
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

export interface ProfileRow {
  id: string;
  handle: string;
  is_private: boolean;
  deleted_at: string | null;
}

/**
 * Prose as typed, split into paragraphs.
 *
 * The column is one text field because that is what somebody typed into one textarea.
 * Blank lines are where they chose to break it. A story with no blank lines is one
 * paragraph, which is a real way to write a short one and not a defect to repair.
 */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The visibility rule, restated over rows the service key returned.
 *
 * Decision 104. The query this feeds runs through serviceClient(), which bypasses RLS by
 * design, so the rule the database would otherwise apply has to be written out. The public
 * read policy on profiles is `using (is_private = false and deleted_at is null)`, and that
 * query is the one that reads handles for public display, so without this restatement it
 * was the single place the rule did not hold. Do not delete this as redundant. It is not
 * inherited.
 *
 * Hidden profiles stay in the map, marked hidden, rather than being dropped. A dropped row
 * is indistinguishable from a profile that does not exist, and those two must stay apart:
 * one is somebody's decision and the other is damage.
 */
export function tellersFromProfiles(profiles: readonly ProfileRow[]): Map<string, Teller> {
  const out = new Map<string, Teller>();
  for (const p of profiles) {
    const hidden = p.is_private || p.deleted_at !== null;
    out.set(p.id, hidden ? { shown: 'anonymous', why: 'private' } : { shown: 'handle', handle: p.handle });
  }
  return out;
}

/** The profile ids a set of rows needs looked up. Anonymous stories need nobody. */
export function authorIdsToResolve(rows: readonly DisasterRow[]): string[] {
  return [...new Set(rows.filter((r) => !r.is_anonymous && r.author_id).map((r) => r.author_id!))];
}

/**
 * What a story's byline is allowed to say, given the row and the profiles that resolved.
 *
 * A map miss is deliberately not treated as anonymity. Every hidden profile is present in
 * the map already, marked hidden, so a miss can only mean the row points at a profile that
 * is not there. That is damage rather than a decision, so it draws no byline and says so
 * in the build log.
 */
export function tellerFor(
  r: DisasterRow,
  tellers: Map<string, Teller>,
  warn: (message: string) => void = console.warn
): Teller {
  if (r.is_anonymous) return { shown: 'anonymous', why: 'chosen' };

  const found = r.author_id ? tellers.get(r.author_id) : undefined;
  if (found) return found;

  warn(
    `Dev disaster ${r.id} is not anonymous but its author_id ${r.author_id ?? 'null'} ` +
      'matched no profile. Drawing it with no byline, because calling it anonymous would ' +
      'misreport a choice the teller did not make.'
  );
  return { shown: 'nothing' };
}

export interface ShapeOptions {
  severityIds: readonly string[];
  likesById: ReadonlyMap<string, number>;
  repliesById: ReadonlyMap<string, number>;
  warn?: (message: string) => void;
}

/** Rows to stories, newest first, with anything undrawable left out and reported. */
export function shapeDisasters(rows: readonly DisasterRow[], tellers: Map<string, Teller>, opts: ShapeOptions): Disaster[] {
  const warn = opts.warn ?? console.warn;
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
    if (!opts.severityIds.includes(r.severity)) {
      warn(
        `Dev disaster ${r.id} has severity "${r.severity}", which is not one of ` +
          `${opts.severityIds.join(', ')}. Left off the site.`
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
      warn(`Dev disaster ${r.id} is published but incomplete. Left off the site.`);
      continue;
    }

    out.push({
      id: r.id,
      slug: r.slug,
      url: `/dev-disasters/${r.slug}/`,
      severity: r.severity as SeverityId,
      title: r.title,
      line: r.line,
      teller: tellerFor(r, tellers, warn),
      likes: opts.likesById.get(String(r.id)) ?? 0,
      replies: opts.repliesById.get(String(r.id)) ?? 0,
      date: new Date(r.published_at),
      featuredAt: r.featured_at ? new Date(r.featured_at) : null,
      body: paragraphs(r.body)
    });
  }

  out.sort((a, b) => b.date.getTime() - a.date.getTime());
  return out;
}
