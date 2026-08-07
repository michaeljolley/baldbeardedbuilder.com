/*
  The parts of the comment layer that are only shapes and rules.

  Split out of comments.ts for the same reason reader.ts is split out of likes.ts: that
  file imports the database client, and a module that imports the database client cannot
  be loaded by plain node. Threading and the moderation numbers are the things most worth
  testing, so they live where a test can reach them.
*/

/*
  Open item settled here.

  Ten an hour is roughly one every six minutes sustained, which nobody reaches by taking
  part in a conversation and anybody reaches by trying to fill one. Thirty a day catches
  the slower version of the same thing. Both are per account, because posting needs a sign
  in and an account is the expensive thing to make.
*/
export const COMMENTS_PER_HOUR = 10;
export const COMMENTS_PER_DAY = 30;

/*
  Long enough to fix a typo or a broken fence, short enough that nobody rewrites what a
  reply is replying to. Edits are marked, so the window is about not surprising people
  rather than about preventing revision.
*/
export const EDIT_WINDOW_MINUTES = 15;

/*
  Reports that hide a comment automatically.

  Three is low on purpose. Post moderation means the alternative to hiding early is
  leaving something up while it does its damage, and a hidden comment is a tombstone that
  a human can put back rather than anything permanent. The number is also written into the
  reports_auto_hide trigger, which is where it actually takes effect.
*/
export const AUTO_HIDE_REPORTS = 3;

export const BODY_MAX = 10_000;

export type CommentStatus = 'visible' | 'held' | 'hidden' | 'deleted';

export interface CommentView {
  id: string;
  parentId: string | null;
  createdAt: string;
  editedAt: string | null;
  status: CommentStatus;
  /** Null for anything not visible. The tombstone says why. */
  html: string | null;
  tombstone: string | null;
  authorHandle: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  likes: number;
  /** True when the reader asking is the author, which is what enables edit and delete. */
  mine: boolean;
  /** True while the new account hold has it. Only ever sent to its own author. */
  held: boolean;
}

export interface Thread {
  comments: CommentView[];
  /** Visible comments only, which is the number the page prints. */
  total: number;
}

/**
 * The line an empty thread prints.
 *
 * "No replies yet" on its own is a dead end, so it carries an invitation. When the reader
 * is signed in and there is a comment badge still in front of them, it carries the badge
 * too, with the real number from the same counter that grants it. Nobody is told they are
 * one reply off something they already have.
 *
 * Copy lives here rather than in the island so the arithmetic and the plural can be
 * tested without a browser, which is the same reason the rest of this file exists.
 */
export function emptyLine(next: { label: string; unit: string | null; remaining: number } | null): string {
  const first = 'No replies yet. Yours would be the first';

  if (!next) return `${first}.`;

  /* One away is worth saying plainly. Counting it out reads like a progress bar. */
  if (next.remaining === 1 && next.label === 'First Reply I') {
    return "Looks like there aren't any replies yet. That means you have the chance to earn the First Reply I badge.";
  }

  if (next.remaining === 1) return `${first}, and it earns you ${next.label}.`;

  const unit = next.unit ? ` ${next.unit}s` : '';
  return `${first}, and you are ${next.remaining}${unit} off ${next.label}.`;
}

/** The signed in reader, as much of them as a byline needs. */
export interface ThreadViewer {
  id: string;
  handle: string;
  name: string | null;
  avatar: string | null;
  isPrivate: boolean;
}

/**
 * Give the author of a held comment their own name back.
 *
 * comments_public strips the byline off anything not visible, which is right for every
 * reader but one. The author is shown their own held comment on purpose, so that writing
 * something does not look like losing it, and a comment you are looking at with an Edit
 * button under it should not be signed by somebody else. Editing made it obvious: the
 * row redraws, and the name it redraws with is the one the view handed over.
 *
 * The rule is that a held comment reads to its author exactly as it will read to everyone
 * once it clears, so a private profile stays unnamed here too. That is the same predicate
 * the view applies, restated for the one row the view cannot apply it to.
 *
 * Held only. Hidden and deleted rows draw tombstones, and naming those is the thing the
 * tombstone exists to avoid.
 */
export function nameOwnHeld(comments: CommentView[], viewer: ThreadViewer | null): CommentView[] {
  if (!viewer || viewer.isPrivate) return comments;

  for (const c of comments) {
    if (c.status !== 'held' || !c.mine) continue;
    c.authorHandle = viewer.handle;
    c.authorName = viewer.name;
    c.authorAvatar = viewer.avatar;
  }

  return comments;
}

/**
 * Whether a comment renders a body, which is the same thing as whether a reader would
 * count it as a reply.
 *
 * Tombstones hold their slot in the thread but they are not replies, and a held comment
 * is visible to exactly one person, its author.
 *
 * This is one function rather than a condition written out wherever it is needed. The
 * rail count and the row branch have to agree about what a reply is, and when they were
 * written separately they drifted: the author of a held comment saw six bodies under a
 * rail that said five, because the server counts visible rows and cannot know that one
 * particular reader has something in the queue.
 */
export function hasBody(c: Pick<CommentView, 'status' | 'mine'>): boolean {
  return c.status === 'visible' || (c.status === 'held' && c.mine);
}

export function initials(name: string | null, handle: string | null): string {
  const source = (name || handle || '').trim();
  if (!source) return '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Top level comments oldest first, each followed by its replies.
 *
 * Done here rather than in SQL because the ordering is a shape rather than a sort, and a
 * thread is small enough that arranging it in memory costs nothing.
 */
export function order(comments: CommentView[]): CommentView[] {
  const tops = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentView[]>();

  for (const c of comments) {
    if (!c.parentId) continue;
    const list = repliesByParent.get(c.parentId) ?? [];
    list.push(c);
    repliesByParent.set(c.parentId, list);
  }

  const out: CommentView[] = [];
  for (const top of tops) {
    out.push(top);
    for (const reply of repliesByParent.get(top.id) ?? []) out.push(reply);
  }

  /*
    A reply whose parent is not readable, which happens when a held parent is being read
    by somebody else. It still belongs in the thread, at the end, rather than disappearing
    along with a parent it has nothing to do with.
  */
  const placed = new Set(out.map((c) => c.id));
  for (const c of comments) if (!placed.has(c.id)) out.push(c);

  return out;
}

/**
 * Whether an edit is still allowed on something written at this time.
 *
 * The window is short and the check runs on the server, so this is the rule rather than a
 * hint the browser is trusted with.
 */
export function withinEditWindow(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() <= EDIT_WINDOW_MINUTES * 60 * 1000;
}
