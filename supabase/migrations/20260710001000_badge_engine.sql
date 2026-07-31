/*
  The badge engine.

  Badges were defined in Phase 4 and nothing has ever granted one. This is the part that
  counts.

  It lives in SQL rather than in a script for one reason: the same numbers have to be
  right in three places at once. A trigger grants on the way in, a nightly job catches
  anything a trigger missed, and the profile page draws a progress bar. If each of those
  did its own counting they would disagree, and the version people would notice is the
  progress bar that says 4 of 5 next to a badge you already have.

  So there is exactly one counter, badge_counts, and everything else reads it.
*/

-- One counter ---------------------------------------------------------------------------

/*
  Returns one row per rule event for one profile, with the number that event is currently
  worth. Twitch numbers are zero for anybody who has not linked, which is most people, and
  that is fine: the shelf shows the badge unearned rather than hiding it, because a
  visible locked badge is how somebody learns linking Twitch does something.

  Matching to the Twitch history prefers a captured user id and falls back to the login.
  See the note on streamUsers.twitch_user_id: logins are mutable, so a login match is a
  guess. The fallback exists because no historical row has an id yet, and a guess that
  rewards a long time viewer beats an empty shelf. Grants record which path found them.
*/
create or replace function public.badge_counts(p_profile uuid)
returns table (event text, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, twitch_user_id, lower(twitch_login) as twitch_login
      from public.profiles
     where id = p_profile
  ),
  /*
    The logins in the history that belong to this profile. An id match wins outright. The
    login fallback only applies when no row in the history carries an id for that login,
    so a renamed account cannot be claimed by whoever holds the old name now.
  */
  mine as (
    select lower(su.login) as login
      from public."streamUsers" su, me
     where (me.twitch_user_id is not null and su.twitch_user_id = me.twitch_user_id)
        or (
             me.twitch_login is not null
             and lower(su.login) = me.twitch_login
             and su.twitch_user_id is null
           )
  ),
  ev as (
    select e."eventType" as kind, e."streamDate" as day, coalesce(e.quantity, 1) as qty
      from public."streamEvents" e
     where lower(e.login) in (select login from mine)
  ),
  /*
    Day One is a date, not a count, and the date is derived rather than hard coded so the
    meaning survives an import of older events. First ninety days of recorded history.
  */
  early as (
    select (min(e."streamDate"::date) + interval '90 days')::date as cutoff
      from public."streamEvents" e
  )
  select 'stream:attended'::text, count(distinct day)::bigint from ev
  union all
  select 'stream:early', (
    select count(distinct ev.day)::bigint from ev, early where ev.day::date < early.cutoff
  )
  union all
  select 'onChatMessage',  coalesce((select sum(qty) from ev where kind = 'onChatMessage'), 0)::bigint
  union all
  select 'twitch:raid',    coalesce((select count(*) from ev where kind = 'twitch:raid'), 0)::bigint
  union all
  select 'twitch:sub',     coalesce((select count(*) from ev where kind = 'twitch:sub'), 0)::bigint
  union all
  select 'twitch:giftsub', coalesce((select sum(qty) from ev where kind = 'twitch:giftsub'), 0)::bigint
  union all
  select 'twitch:cheer',   coalesce((select count(*) from ev where kind = 'twitch:cheer'), 0)::bigint
  union all
  /*
    Site counts. A disaster counts once it is published, not once it is submitted, because
    a badge that arrives before a human has read the thing would be a badge for filling in
    a form. Anonymous ones still count: the byline is hidden, the credit is not.
  */
  select 'site:disaster', (
    select count(*)::bigint from public.disasters
     where author_id = p_profile and status = 'published'
  )
  union all
  select 'site:disaster-error', (
    select count(*)::bigint from public.disasters
     where author_id = p_profile and status = 'published' and severity = 'error'
  )
  union all
  select 'site:comment', (
    select count(*)::bigint from public.comments
     where author_id = p_profile and status = 'visible'
  )
  union all
  /*
    Helpful counts threads, not comments, so twenty five replies to one argument is not
    the same as turning up in twenty five different conversations.
  */
  select 'site:comment-thread', (
    select count(distinct (target_kind::text || ':' || target_key))::bigint
      from public.comments
     where author_id = p_profile and status = 'visible'
  );
$$;

comment on function public.badge_counts(uuid) is
  'One number per badge rule event for one profile. The single source every grant and every progress bar reads.';

-- Granting --------------------------------------------------------------------------------

/*
  Inserts any grant the counts have earned and does nothing else. Never revokes: a badge
  that vanishes because a comment was deleted would punish somebody for tidying up, and
  the whole point of a shelf is that it accumulates.

  p_source separates a badge earned on the site from one found in the Twitch history, so
  the two are still tellable apart afterwards.
*/
create or replace function public.grant_badges(p_profile uuid, p_source text default 'auto')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with counts as (
    select * from public.badge_counts(p_profile)
  )
  insert into public.badge_grants (profile_id, badge_id, source)
  select p_profile, r.badge_id, p_source
    from public.badge_rules r
    join public.badges b on b.id = r.badge_id
    join counts c on c.event = r.event
   where b.is_manual = false
     and c.n >= r.threshold
  on conflict (profile_id, badge_id) do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.grant_badges(uuid, text) is
  'Grants every badge the profile has earned and not yet been given. Additive only, never revokes.';

/*
  Progress. The shelf draws locked badges with a number under them, and this is where that
  number comes from. Manual badges are excluded because there is no progress towards being
  handed something.

  Only the lowest unearned tier in a family is worth showing progress on, but that call
  belongs to the page rather than the query, so every tier comes back and profiles.ts
  picks. Doing it here would mean the nightly job and the page disagreed about what a
  family is.
*/
create or replace function public.badge_progress(p_profile uuid)
returns table (
  badge_id text,
  event text,
  n bigint,
  threshold integer,
  earned boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select * from public.badge_counts(p_profile)
  )
  select
    r.badge_id,
    r.event,
    coalesce(c.n, 0) as n,
    r.threshold,
    exists (
      select 1 from public.badge_grants g
       where g.profile_id = p_profile and g.badge_id = r.badge_id
    ) as earned
  from public.badge_rules r
  join public.badges b on b.id = r.badge_id
  left join counts c on c.event = r.event
  where b.is_manual = false;
$$;

comment on function public.badge_progress(uuid) is
  'Every automatic badge with how far this profile has got towards it.';

-- Grant on the way in ----------------------------------------------------------------------

/*
  A badge that only arrives overnight is a badge that does not exist at the moment somebody
  cares about it, which is the moment they posted the thing. So the write paths grant
  inline.

  These fire on the row that just landed and cost one function call. after insert, so a
  failure in the badge engine cannot take down a comment somebody just wrote.
*/
create or replace function public.badges_after_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'visible' then
    perform public.grant_badges(new.author_id, 'auto');
  end if;
  return null;
end;
$$;

drop trigger if exists comments_grant_badges on public.comments;
create trigger comments_grant_badges
  after insert on public.comments
  for each row execute function public.badges_after_comment();

/*
  Disasters grant on publish rather than on submit, and publish is an update, so this
  watches the status change instead of the insert.
*/
create or replace function public.badges_after_disaster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and new.author_id is not null then
    perform public.grant_badges(new.author_id, 'auto');
  end if;
  return null;
end;
$$;

drop trigger if exists disasters_grant_badges on public.disasters;
create trigger disasters_grant_badges
  after insert or update of status on public.disasters
  for each row execute function public.badges_after_disaster();

-- The backfill -----------------------------------------------------------------------------

/*
  Runs over every profile that has linked Twitch and grants whatever the history says they
  earned. Safe to run repeatedly, which it will be: once when a profile links an account,
  and nightly for anybody whose numbers moved.

  It is written to run over everybody rather than one profile because the expensive part is
  reaching the history at all, and there are 1,850 people in it against a handful of linked
  profiles. If that ratio ever inverts this wants an index and a cursor, not a rewrite.
*/
create or replace function public.backfill_badges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  total integer := 0;
begin
  for p in
    select id from public.profiles
     where twitch_user_id is not null or twitch_login is not null
  loop
    total := total + public.grant_badges(p.id, 'backfill');
  end loop;
  return total;
end;
$$;

comment on function public.backfill_badges() is
  'Grants Twitch history badges to every profile with a linked account. Idempotent.';

-- Who may call what --------------------------------------------------------------------------

/*
  Reads are open to signed in readers because the shelf and its progress are drawn on a
  public profile. The write paths are not: granting is something the database does to
  itself through triggers and something an operator does by hand, never something a browser
  asks for.
*/
revoke all on function public.badge_counts(uuid)          from public, anon, authenticated;
revoke all on function public.grant_badges(uuid, text)    from public, anon, authenticated;
revoke all on function public.backfill_badges()           from public, anon, authenticated;
revoke all on function public.badge_progress(uuid)        from public, anon, authenticated;

grant execute on function public.badge_progress(uuid) to anon, authenticated;
grant execute on function public.badge_counts(uuid)   to anon, authenticated;
