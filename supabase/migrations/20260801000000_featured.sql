/*
  Featuring a story is a real act.

  This column arrived as the first half of the notifications migration, because the
  story_featured email needed something to key off. Notifications were then cut from v1
  and that migration moved to supabase/deferred/. This column did not go with it, and the
  split is the point of this file.

  Featuring is not an email feature. It is what the front page reads. leadDisaster() in
  src/lib/disasters.ts takes the most recently featured published story and falls back to
  the newest when nothing has been featured, which is the state on day one. Before this
  column existed the lead was simply the newest row, so nobody was ever chosen.

  Setting it in Studio is the whole mechanism, which is the correct amount of admin
  tooling for v1: one column, one timestamp, and the front page and the badge key off it.
  The email will too, if it ever ships. See docs/notifications.md.
*/

alter table public.disasters add column featured_at timestamptz;

create index disasters_featured_idx on public.disasters (featured_at desc)
  where featured_at is not null and status = 'published';
