/*
  Comments.

  Decision 16 is post moderation: a comment publishes the moment it is written, with rate
  limits, a hold on brand new GitHub accounts, an auto hide once enough people report it,
  and a ban flag. Nothing waits in a queue for approval, which is the opposite of how dev
  disasters work. Both of those are correct and it is worth keeping them straight.

  Decision 9 allows one level of threading. The database enforces it with a trigger, so
  this file does not have to be the only thing standing between a reply and a reply to a
  reply.
*/

import { serviceClient, supabaseWritable } from './supabase';
import { renderComment } from './markdown';
import { isTargetKind, type TargetKind } from './reader';
import {
  order,
  withinEditWindow,
  BODY_MAX,
  COMMENTS_PER_DAY,
  COMMENTS_PER_HOUR,
  EDIT_WINDOW_MINUTES,
  type CommentStatus,
  type CommentView,
  type Thread
} from './thread';

/* One import for call sites, which is the whole point of splitting the file. */
export * from './thread';

/**
 * A whole thread, ordered oldest first, replies following their parent.
 *
 * Threads on this site are conversations rather than feeds, so they are read whole. If
 * one ever gets long enough to need paging, that is a good problem and a different query.
 */
export async function readThread(
  kind: TargetKind,
  key: string,
  viewerId: string | null
): Promise<Thread> {
  if (!supabaseWritable) return { comments: [], total: 0 };

  const db = serviceClient();

  const [{ data: rows }, { data: likeRows }] = await Promise.all([
    db
      .from('comments_public')
      .select('*')
      .eq('target_kind', kind)
      .eq('target_key', key)
      .order('created_at', { ascending: true }),
    db.from('like_counts').select('target_key, likes').eq('target_kind', 'comment')
  ]);

  const likes = new Map<string, number>();
  for (const row of likeRows ?? []) {
    if (row.target_key) likes.set(row.target_key, Number(row.likes ?? 0));
  }

  /*
    The public view hides the author of anything not visible, so a held comment cannot be
    matched to its writer through it. Ownership comes from the table instead, and only the
    ids: nothing else about a hidden comment leaves the server.
  */
  const mine = new Set<string>();
  if (viewerId) {
    const { data } = await db
      .from('comments')
      .select('id')
      .eq('target_kind', kind)
      .eq('target_key', key)
      .eq('author_id', viewerId);
    for (const row of data ?? []) mine.add(row.id);
  }

  const all: CommentView[] = (rows ?? [])
    .filter((r) => r.id && r.status)
    .map((r) => ({
      id: r.id!,
      parentId: r.parent_id,
      createdAt: r.created_at!,
      editedAt: r.edited_at,
      status: r.status as CommentStatus,
      html: null,
      tombstone: r.tombstone,
      authorHandle: r.author_handle,
      authorName: r.author_name,
      authorAvatar: r.author_avatar,
      likes: likes.get(r.id!) ?? 0,
      mine: mine.has(r.id!),
      held: r.status === 'held'
    }));

  /*
    A held comment is invisible to everybody except the person who wrote it, who sees it
    with a note. Hiding it from its own author would mean they write a comment, watch it
    vanish, and write it again.
  */
  const readable = all.filter((c) => c.status !== 'held' || c.mine);

  const bodies = await bodiesFor(readable.map((c) => c.id));
  for (const c of readable) {
    if (c.status === 'visible' || (c.status === 'held' && c.mine)) {
      c.html = bodies.get(c.id) ?? null;
    }
  }

  return {
    comments: order(readable),
    total: all.filter((c) => c.status === 'visible').length
  };
}

async function bodiesFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;

  const { data } = await serviceClient()
    .from('comments')
    .select('id, body_html')
    .in('id', ids)
    .in('status', ['visible', 'held']);

  for (const row of data ?? []) {
    if (row.body_html) out.set(row.id, row.body_html);
  }
  return out;
}

export type PostResult =
  | { ok: true; id: string; held: boolean }
  | { ok: false; error: string; status: number };

export async function postComment(input: {
  kind: TargetKind;
  key: string;
  parentId: string | null;
  body: string;
  authorId: string;
  hold: boolean;
}): Promise<PostResult> {
  if (!supabaseWritable) return { ok: false, error: 'Comments are off right now.', status: 503 };

  const body = input.body.trim();
  if (!body) return { ok: false, error: 'A comment needs some words in it.', status: 400 };
  if (body.length > BODY_MAX) {
    return { ok: false, error: 'That is longer than a comment box can hold.', status: 400 };
  }

  const db = serviceClient();

  const { data: banned } = await db
    .from('bans')
    .select('reason')
    .eq('profile_id', input.authorId)
    .maybeSingle();

  /*
    A banned account is told its comment did not post, and not told why. The alternative
    is a live readout of what the ban does, which is a debugging aid for the one person
    who should not have one.
  */
  if (banned) return { ok: false, error: 'That did not post.', status: 403 };

  const limit = await overLimit(input.authorId);
  if (limit) return { ok: false, error: limit, status: 429 };

  if (input.parentId) {
    const { data: parent } = await db
      .from('comments')
      .select('id, parent_id, target_kind, target_key, status')
      .eq('id', input.parentId)
      .maybeSingle();

    if (!parent || parent.target_kind !== input.kind || parent.target_key !== input.key) {
      return { ok: false, error: 'That reply has nowhere to go.', status: 400 };
    }
    if (parent.parent_id) {
      return { ok: false, error: 'Replies only go one level deep.', status: 400 };
    }
    if (parent.status !== 'visible') {
      return { ok: false, error: 'That comment is not taking replies.', status: 400 };
    }
  }

  const html = await renderComment(body);

  const { data, error } = await db
    .from('comments')
    .insert({
      target_kind: input.kind,
      target_key: input.key,
      parent_id: input.parentId,
      author_id: input.authorId,
      body_markdown: body,
      body_html: html,
      status: input.hold ? 'held' : 'visible'
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: 'That did not save.', status: 500 };

  return { ok: true, id: data.id, held: input.hold };
}

/** Null when the account is inside both limits, or the sentence to show when it is not. */
async function overLimit(authorId: string): Promise<string | null> {
  const db = serviceClient();
  const now = Date.now();

  const [hour, day] = await Promise.all([
    db
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', authorId)
      .gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()),
    db
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', authorId)
      .gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString())
  ]);

  if ((hour.count ?? 0) >= COMMENTS_PER_HOUR) return 'That is a lot of comments in an hour. Give it a bit.';
  if ((day.count ?? 0) >= COMMENTS_PER_DAY) return 'That is a lot of comments today. Try again tomorrow.';
  return null;
}

export async function editComment(
  id: string,
  authorId: string,
  body: string
): Promise<PostResult> {
  if (!supabaseWritable) return { ok: false, error: 'Comments are off right now.', status: 503 };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'A comment needs some words in it.', status: 400 };
  if (trimmed.length > BODY_MAX) {
    return { ok: false, error: 'That is longer than a comment box can hold.', status: 400 };
  }

  const db = serviceClient();

  const { data: existing } = await db
    .from('comments')
    .select('id, author_id, created_at, status')
    .eq('id', id)
    .maybeSingle();

  /*
    Somebody else's comment and a comment that is not there get the same answer. Telling
    the difference apart would turn this into a way to ask whether a given id exists.
  */
  if (!existing || existing.author_id !== authorId) {
    return { ok: false, error: 'That is not yours to edit.', status: 404 };
  }
  if (existing.status === 'deleted' || existing.status === 'hidden') {
    return { ok: false, error: 'That comment is gone.', status: 409 };
  }

  if (!withinEditWindow(existing.created_at)) {
    return { ok: false, error: `Edits close after ${EDIT_WINDOW_MINUTES} minutes.`, status: 409 };
  }

  const html = await renderComment(trimmed);

  const { error } = await db
    .from('comments')
    .update({ body_markdown: trimmed, body_html: html, edited_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, error: 'That did not save.', status: 500 };
  return { ok: true, id, held: existing.status === 'held' };
}

/**
 * Soft delete, always.
 *
 * The row stays and the body goes. A hole in a thread makes the replies underneath read
 * as answers to nothing, and a hard delete of a comment with replies is refused by the
 * database anyway.
 */
export async function deleteComment(id: string, authorId: string): Promise<PostResult> {
  if (!supabaseWritable) return { ok: false, error: 'Comments are off right now.', status: 503 };

  const db = serviceClient();

  const { data: existing } = await db
    .from('comments')
    .select('id, author_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.author_id !== authorId) {
    return { ok: false, error: 'That is not yours to delete.', status: 404 };
  }
  if (existing.status === 'deleted') return { ok: true, id, held: false };

  const { error } = await db
    .from('comments')
    .update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      body_markdown: '',
      body_html: null
    })
    .eq('id', id);

  if (error) return { ok: false, error: 'That did not save.', status: 500 };
  return { ok: true, id, held: false };
}

/*
  Reply counts for the build, same shape and same reasoning as the like counts.
*/
let allReplies: Map<TargetKind, Map<string, number>> | null = null;

async function loadReplies(): Promise<Map<TargetKind, Map<string, number>>> {
  if (allReplies) return allReplies;

  const built = new Map<TargetKind, Map<string, number>>([
    ['content', new Map()],
    ['disaster', new Map()]
  ]);

  if (supabaseWritable) {
    const { data } = await serviceClient()
      .from('comment_counts')
      .select('target_kind, target_key, replies');

    for (const row of data ?? []) {
      if (!isTargetKind(row.target_kind) || !row.target_key) continue;
      built.get(row.target_kind)!.set(row.target_key, Number(row.replies ?? 0));
    }
  }

  allReplies = built;
  return built;
}

export async function bakedReplies(kind: TargetKind, key: string): Promise<number> {
  return (await loadReplies()).get(kind)?.get(key) ?? 0;
}
