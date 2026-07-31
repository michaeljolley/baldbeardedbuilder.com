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

export interface AccountView {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  links: { label: string; url: string }[];
  isPrivate: boolean;
  githubLogin: string | null;
  twitchLogin: string | null;
}

export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
export const BIO_MAX = 280;
export const LINKS_MAX = 4;
export const LABEL_MAX = 40;

/** Keeps only http and https. A javascript: or data: URL in a profile link is an attack. */
export function safeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function readAccount(profileId: string): Promise<AccountView | null> {
  if (!supabaseWritable) return null;

  const db = serviceClient();

  const { data: profile } = await db
    .from('profiles')
    .select('id, handle, display_name, bio, links, is_private, github_login, twitch_login')
    .eq('id', profileId)
    .maybeSingle();

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
    twitchLogin: profile.twitch_login
  };
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export async function saveAccount(profileId: string, form: FormData): Promise<SaveResult> {
  if (!supabaseWritable) return { ok: false, error: 'Accounts are not available right now.' };

  const db = serviceClient();

  const handle = String(form.get('handle') ?? '').trim().toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: 'A handle is 3 to 32 characters, lower case letters, numbers and hyphens, and cannot start or end with a hyphen.'
    };
  }

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

  const displayName = String(form.get('display_name') ?? '').trim().slice(0, 60);
  const bio = String(form.get('bio') ?? '').trim().slice(0, BIO_MAX);

  const links: { label: string; url: string }[] = [];
  for (let i = 0; i < LINKS_MAX; i++) {
    const url = safeUrl(String(form.get(`link_url_${i}`) ?? ''));
    if (!url) continue;
    const label = String(form.get(`link_label_${i}`) ?? '').trim().slice(0, LABEL_MAX);
    links.push({ label: label || new URL(url).hostname.replace(/^www\./, ''), url });
  }

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

  /*
    notification_prefs is deliberately not written here. v1 sends no email, so the
    settings form has no switches, and a form with no switches posts no fields. Reading
    them anyway would turn every ordinary save into "off, off, off", because a missing
    checkbox and an unticked one are the same absence in form data.

    The row still exists, created with every column defaulting to true by the profile
    trigger, so whoever turns notifications back on starts from the state that was
    designed rather than from three falses nobody chose. See src/lib/notifications.ts.
  */

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
