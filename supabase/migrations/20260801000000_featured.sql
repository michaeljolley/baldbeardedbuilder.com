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

-- The Featured badge ---------------------------------------------------------------------

/*
  The badge is seeded as manual in 20260710000200_v2_seed.sql because there was no rule
  that could grant it. Featuring a story is that rule, so the grant is recorded as manual:
  a person decided, the database only wrote it down.

  This grant used to live inside notify_disaster_change, in the same branch that enqueued
  the story_featured email, which meant deferring the email deferred the badge with it.
  That would have left a badge on the shelf that no action could ever earn, which is the
  same shape of bug as a preference for an event with no cause. So it is its own trigger,
  keyed off the timestamp rather than off anything to do with mail.

  Fires on the transition only. old.featured_at is null on insert, so a story that arrives
  already featured grants once, and a Studio edit that touches another column on an
  already featured row grants nothing. The unique constraint is the backstop rather than
  the mechanism.

  author_id is nullable, because a story can be submitted without an account. Anonymous is
  about the byline rather than the author, so this deliberately ignores is_anonymous: a
  person who asked not to be named still earned the badge.
*/
create or replace function public.grant_featured_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.featured_at is not null
     and (tg_op = 'INSERT' or old.featured_at is null)
     and new.author_id is not null
  then
    insert into public.badge_grants (profile_id, badge_id, source, note)
    values (new.author_id, 'featured', 'manual', 'Story ' || new.id::text || ' went on the front page')
    on conflict (profile_id, badge_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.grant_featured_badge() from public, anon, authenticated;

create trigger disasters_grant_featured
after insert or update of featured_at on public.disasters
for each row execute function public.grant_featured_badge();
