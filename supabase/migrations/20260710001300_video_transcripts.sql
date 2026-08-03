/*
  Video transcripts and chapters.

  Conflict 4 in the build plan, and the largest single unknown in it. Decision 22 says no
  transcript, no page, and there are 42 long form videos with no transcript anywhere.

  Two things had to be worked out, and they landed in different places.

  Chapters turned out to be free. YouTube hands them back through the same InnerTube call
  that serves the watch page, as DESCRIPTION_CHAPTERS with millisecond starts, and no key
  or account is needed to ask. pnpm video:meta fills them in.

  Transcripts are not free. The public timedtext endpoint now answers every request with a
  200 and an empty body unless it is carrying a proof of origin token, which means the
  route every scraper used is closed. The route that is open is the one that was always
  correct: the YouTube Data API, authenticated as the channel owner, downloading captions
  from his own videos. That needs credentials rather than cleverness, and it will keep
  working, which the scraped route would not have.

  So this table holds both, they arrive independently, and the page draws whichever it has.
  A video with chapters and no transcript is a better page than a video with neither, and
  it is a much better page than no page at all.

  Read at build time through the anon key, which is why the read policy is open. There is
  nothing private here: it is a transcript of a public video.
*/

create table public.video_transcripts (
  /* The YouTube id, which is also the tail of the content key videos:<id>. */
  video_id text primary key,

  /*
    Where the transcript came from, so a machine written one is never quietly presented as
    if somebody checked it.

    youtube  captions pulled from the Data API, which for this channel means the ones
             already published against the video
    whisper  transcribed from the audio, unreviewed
    manual   written or corrected by hand
  */
  source text check (source in ('youtube', 'whisper', 'manual')),

  language text not null default 'en',

  /*
    Timed segments, as [{ start: <seconds>, end: <seconds>, speaker: "...", text: "..." }].
    Speaker is optional. Seconds rather than milliseconds because the only thing that consumes
    them is a YouTube deep link, which takes seconds, and storing a unit that has to be divided
    on the way out is how a rounding bug gets in.
  */
  segments jsonb,

  /* The whole thing as prose, for search indexing and for a reader who wants to skim. */
  body text,

  /*
    Chapters, as [{ t: <seconds>, title: "..." }]. Separate from segments because they
    arrive separately and either can exist without the other.
  */
  chapters jsonb,

  /* Seconds. Useful for drawing a chapter's length without reparsing the whole segment list. */
  duration integer,

  transcript_updated_at timestamptz,
  chapters_updated_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.video_transcripts is
  'Transcripts and chapters for long form videos. Read at build time, written by pnpm video:meta and pnpm transcripts.';

create index video_transcripts_has_body_idx
  on public.video_transcripts (video_id)
  where body is not null;

alter table public.video_transcripts enable row level security;

/*
  Anyone may read. This is a transcript of a public video, and the build reads it with the
  anon key like it reads the like counts.
*/
create policy "transcripts are public"
  on public.video_transcripts for select
  using (true);

/*
  Nobody may write through the API. Both writers run as the service role, which bypasses
  this, and there is no path on the site that should ever be creating one.
*/
