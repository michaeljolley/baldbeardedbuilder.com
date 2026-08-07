/*
  The comment endpoints.

  GET reads a thread. POST writes one, PATCH edits within the window, DELETE tombstones.

  Reading is open to anybody. Everything that writes needs a sign in, because decision 16
  hangs its whole moderation story on there being an account behind every comment: rate
  limits, the new account hold, and the ban flag all need somebody to point at.
*/

import type { APIRoute } from 'astro';
import {
  readThread,
  postComment,
  editComment,
  deleteComment,
  BODY_MAX,
  EDIT_WINDOW_MINUTES
} from '../../lib/comments';
import { isTargetKey, isTargetKind } from '../../lib/reader';
import { isNewAccount } from '../../lib/auth';
import { supabaseWritable } from '../../lib/supabase';

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

const bad = (message: string, status = 400) => json({ error: message }, status);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async (context) => {
  const kind = context.url.searchParams.get('kind');
  const key = context.url.searchParams.get('key');

  if (!isTargetKind(kind) || !isTargetKey(key)) return bad('Unknown target.');

  const viewer = context.locals.profile?.id ?? null;
  const thread = await readThread(kind, key, viewer);

  return json({
    ...thread,
    /* The island needs to know what it is allowed to draw before it draws it. */
    viewer: context.locals.profile
      ? {
          id: context.locals.profile.id,
          handle: context.locals.profile.handle,
          name: context.locals.profile.display_name,
          avatar: context.locals.profile.avatar_url
        }
      : null,
    limits: { bodyMax: BODY_MAX, editWindowMinutes: EDIT_WINDOW_MINUTES }
  });
};

export const POST: APIRoute = async (context) => {
  if (!supabaseWritable) return bad('Comments are off right now.', 503);

  const profile = context.locals.profile;
  if (!profile) return bad('Sign in to comment.', 401);

  let payload: Record<string, unknown>;
  try {
    payload = await context.request.json();
  } catch {
    return bad('Send JSON.');
  }

  const { kind, key, parentId, body } = payload;
  if (!isTargetKind(kind) || !isTargetKey(key)) return bad('Unknown target.');
  if (typeof body !== 'string') return bad('A comment needs some words in it.');
  if (parentId !== null && parentId !== undefined && (typeof parentId !== 'string' || !UUID_RE.test(parentId))) {
    return bad('That reply has nowhere to go.');
  }

  /*
    Decision 16's hold. A GitHub account made this week can comment, and the comment waits
    for a look before anybody else sees it. The author sees it the whole time, with a note,
    because the alternative is watching your own words vanish and writing them again.
  */
  const hold = isNewAccount(profile.github_created_at, profile.created_at);

  const result = await postComment({
    kind,
    key,
    parentId: (parentId as string | undefined) ?? null,
    body,
    authorId: profile.id,
    hold
  });

  if (!result.ok) return bad(result.error, result.status);
  return json({ id: result.id, held: result.held }, 201);
};

export const PATCH: APIRoute = async (context) => {
  const profile = context.locals.profile;
  if (!profile) return bad('Sign in to edit.', 401);

  let payload: Record<string, unknown>;
  try {
    payload = await context.request.json();
  } catch {
    return bad('Send JSON.');
  }

  const { id, body } = payload;
  if (typeof id !== 'string' || !UUID_RE.test(id)) return bad('Unknown comment.');
  if (typeof body !== 'string') return bad('A comment needs some words in it.');

  const result = await editComment(id, profile.id, body);
  if (!result.ok) return bad(result.error, result.status);
  return json({ id: result.id });
};

export const DELETE: APIRoute = async (context) => {
  const profile = context.locals.profile;
  if (!profile) return bad('Sign in to delete.', 401);

  const id = context.url.searchParams.get('id');
  if (typeof id !== 'string' || !UUID_RE.test(id)) return bad('Unknown comment.');

  const result = await deleteComment(id, profile.id);
  if (!result.ok) return bad(result.error, result.status);
  return json({ id: result.id });
};
