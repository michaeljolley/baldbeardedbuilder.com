/*
  Reading and writing your own account.

  Deliberately plain: no island, no fetch, no optimistic state. A settings form is the
  one place on the site where a person needs to be certain the thing they clicked
  actually happened, and a full page POST with a redirect is the only pattern that is
  certain by construction. It also works with JavaScript off, which the rest of the site
  promises anyway.
*/

import type { APIContext } from 'astro';
import { serviceClient, supabaseWritable } from './supabase';
import type { Submission, SubmissionStatus } from './submissions';
import {
  normalizeHandle,
  handleProblem,
  linksFrom,
  textField,
  BIO_MAX,
  DISPLAY_NAME_MAX
} from './profile-fields';

export interface AccountView {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  links: { label: string; url: string }[];
  isPrivate: boolean;
  githubLogin: string | null;
  twitchLogin: string | null;
  email: string | null;
  preferences: {
    storyPublished: boolean;
    storyFeatured: boolean;
    commentReply: boolean;
  } | null;
}

/*
  The field rules live in profile-fields.ts so a test can run them. This file cannot be
  imported by one: it reaches ./supabase, which is a directory, and node refuses that
  before any assertion runs. Re-exported here so call sites import one thing.
*/
export * from './profile-fields';

export async function readAccount(profileId: string): Promise<AccountView | null> {
  if (!supabaseWritable) return null;

  const db = serviceClient();

  const [
    { data: profile, error: profileError },
    { data: preferences, error: preferencesError },
    { data: authUser, error: authError }
  ] = await Promise.all([
    db
      .from('profiles')
      .select('id, handle, display_name, bio, links, is_private, github_login, twitch_login')
      .eq('id', profileId)
      .maybeSingle(),
    db
      .from('notification_prefs')
      .select('story_published, story_featured, comment_reply')
      .eq('profile_id', profileId)
      .maybeSingle(),
    db.auth.admin.getUserById(profileId)
  ]);

  if (profileError) throw new Error(`Could not read account profile: ${profileError.code}`);
  if (preferencesError) {
    throw new Error(`Could not read notification preferences: ${preferencesError.code}`);
  }
  if (authError) throw new Error(`Could not read account email: ${authError.status ?? 'unknown'}`);

  if (!profile) return null;

  const links = Array.isArray(profile.links)
    ? (profile.links as { label?: string; url?: string }[])
        .map((l) => ({ label: String(l?.label ?? ''), url: String(l?.url ?? '') }))
        .filter((l) => l.url)
    : [];

  return {
    id: profile.id,
    handle: profile.handle,
    displayName: profile.display_name ?? '',
    bio: profile.bio ?? '',
    links,
    isPrivate: profile.is_private,
    githubLogin: profile.github_login,
    twitchLogin: profile.twitch_login,
    email: authUser.user?.email ?? null,
    preferences: preferences
      ? {
          storyPublished: preferences.story_published,
          storyFeatured: preferences.story_featured,
          commentReply: preferences.comment_reply
        }
      : null
  };
}

/*
  Your own submissions, newest first, every status.

  This remains the complete feedback loop for a submitted story. Email reports publication
  and featuring when enabled, but a submission that is not published sends nothing.
  disasters_own_read in the RLS already allows a person to see their own rows in any state,
  and disasters_author_idx already covers the filter.

  What a person is told about each row lives in submissions.ts, which imports nothing so
  the copy can be tested without a database.
*/
export async function readOwnSubmissions(profileId: string): Promise<Submission[]> {
  if (!supabaseWritable) return [];

  const { data } = await serviceClient()
    .from('disasters')
    .select('id, title, slug, status, is_anonymous, submitted_at, published_at, moderation_note')
    .eq('author_id', profileId)
    .order('submitted_at', { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string | null;
    slug: string | null;
    status: string;
    is_anonymous: boolean;
    submitted_at: string;
    published_at: string | null;
    moderation_note: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status as SubmissionStatus,
    isAnonymous: r.is_anonymous,
    submittedAt: new Date(r.submitted_at),
    publishedAt: r.published_at ? new Date(r.published_at) : null,
    note: r.moderation_note
  }));
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export async function saveAccount(profileId: string, form: FormData): Promise<SaveResult> {
  if (!supabaseWritable) return { ok: false, error: 'Accounts are not available right now.' };

  const db = serviceClient();

  const handle = normalizeHandle(form.get('handle'));
  const handleError = handleProblem(handle);
  if (handleError) return { ok: false, error: handleError };

  const { data: reserved } = await db
    .from('reserved_handles')
    .select('handle')
    .eq('handle', handle)
    .maybeSingle();

  const { data: taken } = await db
    .from('profiles')
    .select('id')
    .eq('handle', handle)
    .neq('id', profileId)
    .maybeSingle();

  if (reserved || taken) return { ok: false, error: 'That handle is taken.' };

  const displayName = textField(form.get('display_name'), DISPLAY_NAME_MAX);
  const bio = textField(form.get('bio'), BIO_MAX);

  const links = linksFrom((name) => form.get(name));

  const { error: profileError } = await db
    .from('profiles')
    .update({
      handle,
      display_name: displayName || null,
      bio: bio || null,
      links,
      is_private: form.get('is_private') === 'on'
    })
    .eq('id', profileId);

  if (profileError) return { ok: false, error: 'Could not save that. Try again in a moment.' };

  return { ok: true };
}

export async function saveNotificationPrefs(
  profileId: string,
  form: FormData
): Promise<SaveResult> {
  if (!supabaseWritable) {
    return { ok: false, error: 'Email settings are not available right now.' };
  }

  const db = serviceClient();
  const { data: authUser, error: authError } = await db.auth.admin.getUserById(profileId);

  if (authError || !authUser.user?.email) {
    return {
      ok: false,
      error: 'Your auth provider has not supplied an email address for notifications.'
    };
  }

  const { data, error } = await db
    .from('notification_prefs')
    .update({
      story_published: form.get('story_published') === 'on',
      story_featured: form.get('story_featured') === 'on',
      comment_reply: form.get('comment_reply') === 'on'
    })
    .eq('profile_id', profileId)
    .select('profile_id')
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: 'Could not save email settings. Try again in a moment.' };
  }

  return { ok: true };
}

/*
  Deleting means deleting.

  Decision 17 does not want a soft delete that quietly keeps the row so the site can go on
  showing a name. It wants the auth user gone, which cascades the profile, which cascades
  the grants and the preferences. What survives is what somebody chose to make public: a
  published story stays published, detached from its author and attributed to nobody.
*/
export async function deleteAccount(profileId: string): Promise<SaveResult> {
  if (!supabaseWritable) return { ok: false, error: 'Accounts are not available right now.' };

  const db = serviceClient();

  const { error: detachStories } = await db
    .from('disasters')
    .update({ author_id: null, is_anonymous: true })
    .eq('author_id', profileId);

  if (detachStories) return { ok: false, error: 'Could not delete the account. Nothing was changed.' };

  /* A comment is a conversation somebody else is still part of, so the thread keeps its
     shape and the comment becomes a tombstone rather than a hole. */
  const { error: tombstoneComments } = await db
    .from('comments')
    .update({ author_id: null, status: 'deleted', body_markdown: '', deleted_at: new Date().toISOString() })
    .eq('author_id', profileId);

  if (tombstoneComments) return { ok: false, error: 'Could not delete the account. Nothing was changed.' };

  const { error } = await db.auth.admin.deleteUser(profileId);
  if (error) return { ok: false, error: 'Could not delete the account. Nothing was changed.' };

  return { ok: true };
}

/** Clears the session cookies Supabase set, so the browser stops presenting a dead token. */
export function clearSession(context: APIContext): void {
  for (const cookie of context.cookies.headers()) {
    const name = cookie.split('=')[0];
    if (name.startsWith('sb-')) context.cookies.delete(name, { path: '/' });
  }
}
