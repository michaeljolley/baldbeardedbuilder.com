/*
  A video can stay in the YouTube catalogue without appearing on this site.

  Existing rows and new rows remain included by default. Setting included to false in
  Supabase Studio removes the video from every item-backed surface on the next build,
  including feeds, detail pages, search, and the sitemap.
*/

alter table public.video_pages
  add column included boolean not null default true;

comment on column public.video_pages.included is
  'Whether this video appears anywhere on the site. False excludes it from the build.';
