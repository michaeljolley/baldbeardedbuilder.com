/*
  Submitting a dev disaster.

  A plain form post, same as the report endpoint and for the same reason: the page has to
  work with JavaScript off. Decision 7 makes disasters pre moderated, which is the
  opposite of how comments work, so nothing here publishes anything. A submission lands
  with status pending and moves by hand in Studio.

  Signing in is required. Decision 25 gives the person who sent a story a badge and the
  ability to edit it until it publishes, and neither exists without an account to attach
  them to. Publishing anonymously is a separate choice, so the person can keep their name
  and handle off the published story.

  Decision 25 also promised an email when the story ran. Notifications were cut from v1,
  so that promise is not made anywhere a person can read it. See docs/notifications.md.
*/

import type { APIRoute } from 'astro';
import { serviceClient, supabaseWritable } from '../../lib/supabase';
import { RESERVED_DISASTER_SLUGS, SITE } from '../../config/site';
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
   useless to a script. The host is exempt: the limit is there to keep the moderation queue
   from being filled by somebody else, and I am the one emptying it. */
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

  /*
    Every read below checks its own error, which the three of them did not used to do.

    A failed Supabase call returns { data: null, error }, so destructuring only data
    turns "I could not ask" into "the answer was no". That is harmless on a read whose
    absence means nothing, and it is not harmless here, because all three are gates and
    all three fail open. An unreachable database would wave a banned person through,
    reset the daily count to zero, and hand uniqueSlug an empty set of taken slugs, and
    none of it would show up anywhere. A read that cannot answer is a refusal now.
  */

  const { data: banned, error: bansError } = await db
    .from('bans')
    .select('reason')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (bansError) {
    console.error(`Could not check bans for ${profile.id}: ${bansError.message}`);
    return back('?sent=failed');
  }

  /* Same as comments: told it did not send, not told why. */
  if (banned) return back('?sent=failed');

  /*
    Decision 7 makes every submission cost me a read in Studio, and the limit is what keeps
    that queue from being filled by one person. I am the one emptying it, so the gate does
    not apply to me and the count is skipped outright rather than counted and ignored:
    there is no reason to ask the database a question whose answer cannot change anything.
  */
  if (profile.id !== SITE.hostProfileId) {
    const { count, error: countError } = await db
      .from('disasters')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (countError) {
      console.error(`Could not count today's submissions for ${profile.id}: ${countError.message}`);
      return back('?sent=failed');
    }

    if ((count ?? 0) >= SUBMISSIONS_PER_DAY) return back('?sent=slow');
  }

  /*
    Decision 25. The draft is written before the insert so that a story arrives in Studio
    already readable, rather than as an untitled wall of text I have to open to identify.
    draftDisaster never throws, so a model outage costs a better title and nothing else.
  */
  const draft = await draftDisaster(body);

  const { data: existing, error: slugsError } = await db
    .from('disasters')
    .select('slug')
    .not('slug', 'is', null);

  if (slugsError) {
    console.error(`Could not read taken disaster slugs: ${slugsError.message}`);
    return back('?sent=failed');
  }

  /*
    The reserved words go in with the taken slugs rather than being checked separately.

    /dev-disasters/[...filter] serves every severity and sort view from the same path
    segment a story slug occupies, so a story slugged "newest" would sit on top of the
    "all, newest" view of the archive. RESERVED_DISASTER_SLUGS has existed since the route
    was written and its own docstring said this endpoint checked it. Nothing imported it.
    It was declared, exported, documented, and consumed by no code at all.

    That went unnoticed because the wall was reading a committed seed file, and a test over
    that file was the only thing enforcing the rule. The seed is gone, so this is now the
    only place the rule can be enforced, and it is the right place: a slug is decided here.

    Seeding the set means uniqueSlug's own collision loop does the work, so a story that
    drafts as "newest" becomes "newest-2" and nothing has to fail.
  */
  const taken = new Set([
    ...RESERVED_DISASTER_SLUGS,
    ...(existing ?? []).map((r) => r.slug!).filter(Boolean)
  ]);

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

  if (error) {
    console.error(`Could not insert a dev disaster for ${profile.id}: ${error.message}`);
    return back('?sent=failed');
  }

  return back('?sent=1');
};
