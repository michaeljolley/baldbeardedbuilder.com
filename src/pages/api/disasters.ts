/*
  Submitting a dev disaster.

  A plain form post, same as the report endpoint and for the same reason: the page has to
  work with JavaScript off. Decision 7 makes disasters pre moderated, which is the
  opposite of how comments work, so nothing here publishes anything. A submission lands
  with status pending and moves by hand in Studio.

  Signing in is required. Decision 25 promises the person who sent a story an email when
  it runs, a badge, and the ability to edit it until it publishes, and none of those exist
  without an account to attach them to. Publishing anonymously is a separate choice, and
  the default, so the person is known to me and to nobody else.
*/

import type { APIRoute } from 'astro';
import { serviceClient, supabaseWritable } from '../../lib/supabase';
import { draftDisaster, uniqueSlug } from '../../lib/draft';

export const prerender = false;

/*
  Long enough for the story somebody has been carrying for ten years, short enough that
  the box is not a way to fill a table. The mockup promises no maximum, and it is right to
  in spirit: nobody will reach this by telling a story.
*/
const BODY_MAX = 40_000;
const BODY_MIN = 120;

/* Pre moderation means each one costs me a read. Three a day is generous for a person and
   useless to a script. */
const SUBMISSIONS_PER_DAY = 3;

const back = (query: string) => new Response(null, { status: 303, headers: { location: `/submit/${query}` } });

export const POST: APIRoute = async (context) => {
  if (!supabaseWritable) return back('?sent=off');

  const profile = context.locals.profile;
  if (!profile) return back('?sent=signin');

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return back('?sent=bad');
  }

  const body = String(form.get('story') ?? '').trim();
  const anonymous = form.get('anonymous') !== null;
  const consented = form.get('consent_scrubbed') !== null && form.get('consent_publish') !== null;

  if (!consented) return back('?sent=consent');
  if (body.length < BODY_MIN) return back('?sent=short');
  if (body.length > BODY_MAX) return back('?sent=long');

  const db = serviceClient();

  const { data: banned } = await db
    .from('bans')
    .select('reason')
    .eq('profile_id', profile.id)
    .maybeSingle();

  /* Same as comments: told it did not send, not told why. */
  if (banned) return back('?sent=failed');

  const { count } = await db
    .from('disasters')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', profile.id)
    .gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if ((count ?? 0) >= SUBMISSIONS_PER_DAY) return back('?sent=slow');

  /*
    Decision 25. The draft is written before the insert so that a story arrives in Studio
    already readable, rather than as an untitled wall of text I have to open to identify.
    draftDisaster never throws, so a model outage costs a better title and nothing else.
  */
  const draft = await draftDisaster(body);

  const { data: existing } = await db.from('disasters').select('slug').not('slug', 'is', null);
  const taken = new Set((existing ?? []).map((r) => r.slug!).filter(Boolean));

  const { error } = await db.from('disasters').insert({
    slug: uniqueSlug(draft.slug, taken),
    title: draft.title,
    line: draft.line,
    severity: draft.severity,
    body,
    author_id: profile.id,
    is_anonymous: anonymous,
    status: 'pending',
    /* So I can see at a glance which titles nobody has checked, and which ones were
       written by a fallback that was never meant to be good. */
    moderation_note: draft.fromModel ? 'Title drafted by the model.' : 'Model unavailable, title drafted from the opening line.'
  });

  if (error) return back('?sent=failed');
  return back('?sent=1');
};
