/*
  Your own submissions, and where each one stands.

  This exists because v1 sends no email. Somebody hands over the worst thing that ever
  happened to them at work and, with nothing landing in their inbox, has no way of
  learning what became of it. Email was carrying that loop and nothing else was.

  It closes by letting a person look. No sender, no address, no unsubscribe, no consent
  question. They come back to a page that only they can see and read the state off it.

  Why /account/ rather than /builders/[handle]/. The public profile is public, so
  anything that renders pending and rejected rows there has to be gated on the viewer,
  and a page that draws one thing for one particular reader is the exact bug that had to
  be fixed twice on this branch: the offline reply count and the held comment off by one.
  /account/ is signed in only by construction and has no such state to get wrong.

  Anonymous is about the byline, not the author. A story published anonymously still
  appears here, because the person who sent it is the person reading, and hiding it would
  make the only feedback loop they have lie to them about their own submission.

  Nothing in this file imports anything, deliberately. The copy in it is the whole of what
  a person is told about their own story, so it has to be testable without a database, and
  a module that reaches for the Supabase client cannot be loaded by the node test runner.
  The query lives in account.ts, next to the other reads that page does.
*/

export type SubmissionStatus = 'pending' | 'published' | 'rejected';

export interface Submission {
  id: string;
  title: string | null;
  slug: string | null;
  status: SubmissionStatus;
  isAnonymous: boolean;
  submittedAt: Date;
  publishedAt: Date | null;
  note: string | null;
}

export interface SubmissionState {
  /** The one word state, for the marker beside the row. */
  label: string;
  /** Maps to the marker classes in app.css, which map to existing theme tokens. */
  tone: 'waiting' | 'live' | 'closed';
  /** Where it went, when it went anywhere. */
  href: string | null;
  /** A sentence saying what that state means, because one word is not an explanation. */
  detail: string;
}

/*
  Pure, so the copy can be tested without a database. Every branch has to read correctly
  to somebody who told you the worst thing that ever happened to them at work, which is
  a higher bar than a status label usually has to clear.

  Rejected carries the note when there is one, and does not apologise or pad when there
  is not. A story not running is not a judgement, and saying so at length would suggest
  it might be.
*/
export function submissionState(s: Submission): SubmissionState {
  if (s.status === 'published' && s.slug) {
    return {
      label: 'Published',
      tone: 'live',
      href: `/dev-disasters/${s.slug}/`,
      detail: s.isAnonymous
        ? 'It is up, with your name and handle off it.'
        : 'It is up.'
    };
  }

  /*
    Published with no slug should not happen, and if it does the honest thing is to say
    it is up rather than to link somewhere that 404s. A dead link here would read as the
    story having been taken down.
  */
  if (s.status === 'published') {
    return {
      label: 'Published',
      tone: 'live',
      href: null,
      detail: 'It is up. The link is not ready yet, so give it a minute.'
    };
  }

  if (s.status === 'rejected') {
    return {
      label: 'Not running',
      tone: 'closed',
      href: null,
      detail: s.note
        ? s.note
        : 'Most of the time this is that I already have three too much like it. It is not a judgement about you or about the story.'
    };
  }

  return {
    label: 'Waiting',
    tone: 'waiting',
    href: null,
    detail: 'It is in the queue. I read everything that comes in.'
  };
}

/*
  A story in the queue has no title until the model has drafted one and Michael has been
  past it, so this has to render something a person recognises as theirs in the meantime.
  The date they sent it is what they have.
*/
export function submissionTitle(s: Submission): string {
  if (s.title) return s.title;

  const when = s.submittedAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `Your story from ${when}`;
}