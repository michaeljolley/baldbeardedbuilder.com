/*
  Video pages.

  Decision 22 and amendment 47 say a video with no transcript and no written intro does
  not get a page. Until now that rule was written in a comment and broken in the build:
  every video got a detail page, and every one of those pages carried a line apologising
  that the transcript was not up yet. That is the "coming soon" page the rule exists to
  prevent, and with an empty database it was the only kind of video page the site had.

  So the rule needs a row to point at. A video has a page if and only if it has a row
  here. Nothing infers it, nothing derives it from whether a transcript happens to exist,
  and there is no state where a page half exists. Michael writes the intro, the row lands,
  the next build has the page. Nothing before that build shows a link to it.

  This table is the authored half. video_transcripts is the machine half, and either can
  arrive without the other, which is why they are not the same table. A row here with no
  transcript is a video Michael wrote about. A transcript with no row here is a transcript
  waiting for somebody to decide the video deserves a page.

  Naming, deliberately. The legacy project has a videos table that is the idea generation
  pipeline, the content submodule has a videos collection that is the catalogue, and this
  is neither. It is named for what it holds, which is pages.

  Read at build time through the anon key, same as the like counts and the transcripts.
*/

create table public.video_pages (
  /* The YouTube id, which is also the tail of the content key videos:<id>. */
  video_id text primary key,

  /*
    The card summary in a topic feed and the lede on the page.

    Videos in the content submodule carry no description at all, so without this a feed
    row is a title and a runtime. That is a fine row and it ships that way on day one.
    This is the enhancement, not the requirement.
  */
  summary text,

  /*
    The written introduction, in markdown. The thing that makes the page worth landing on
    rather than a frame around an embed.
  */
  intro_markdown text,

  /*
    When the page goes live. Future dated rows build but stay out of every listing, the
    same rule the content submodule already uses for staged posts, so a page can be
    written ahead of time without appearing early.
  */
  published_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.video_pages is
  'One row per video that has earned a detail page. No row means no page, per decision 22 and amendment 47.';

alter table public.video_pages enable row level security;

/*
  Anyone may read. This is copy about a public video, and the build reads it with the anon
  key like it reads everything else it bakes in.
*/
create policy "video pages are public"
  on public.video_pages for select
  using (true);

/*
  Nobody may write through the API. Michael writes these in Studio as the service role,
  and there is no path on the site that should ever be creating one.
*/
