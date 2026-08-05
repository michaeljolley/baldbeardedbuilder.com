-- Streams watched, counted honestly.
--
-- The profile stat strip wants the number of streams somebody turned up to, not the
-- number of things they did while they were there. Those are wildly different numbers:
-- one chatty evening can be four hundred streamEvents rows and is still one stream.
--
-- PostgREST cannot express a distinct count, so this has to be a function. It is also
-- far cheaper than the alternative, which is shipping every matching row to the site and
-- deduping in JavaScript.
--
-- Security definer because "streamEvents" is not readable by anon or authenticated, and
-- should stay that way. This function returns a single integer about one login and
-- nothing else, so it is a safe narrow window onto a table that stays closed.

create index if not exists "streamEvents_login_streamDate_idx"
  on public."streamEvents" (login, "streamDate");

create or replace function public.streams_watched(p_login text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct "streamDate")::integer
  from public."streamEvents"
  where login = p_login;
$$;

comment on function public.streams_watched(text) is
  'Distinct stream days a Twitch login appeared in chat. Powers the builder profile stat strip.';

revoke all on function public.streams_watched(text) from public;
grant execute on function public.streams_watched(text) to service_role;

-- The other half of the same problem.
--
-- profiles.created_at is the day somebody first signed in to v2, which for every single
-- person alive is going to be 2026. For a long time community member that is a lie by
-- omission: they have been here since 2019. If they link Twitch, the first time they
-- appeared in chat is the honest answer, so the profile uses that when it exists and
-- falls back to created_at when it does not.

create or replace function public.twitch_first_seen(p_login text)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select min("streamDate")::date
  from public."streamEvents"
  where login = p_login;
$$;

comment on function public.twitch_first_seen(text) is
  'First stream day a Twitch login appeared in chat. Gives a builder profile an honest joined date.';

revoke all on function public.twitch_first_seen(text) from public;
grant execute on function public.twitch_first_seen(text) to service_role;
