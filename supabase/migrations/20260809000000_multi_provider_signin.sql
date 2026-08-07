/*
  Three ways in, not one.

  Decision 4 said GitHub was the only way in, and decision 13 said Twitch was an identity
  you attach to an account you already have. Both are revised here. GitHub, Discord and
  Twitch can all create an account now, because the people who read this site do not all
  live on GitHub, and telling somebody their Discord account is not good enough to leave a
  comment is a strange thing to say out loud.

  What that costs: the profile columns were named after GitHub because GitHub was the only
  thing that ever filled them. They keep those names, because renaming a column that four
  queries read to say the same thing in a longer way is churn. Instead Discord gets its own
  pair alongside the Twitch pair that was already here, and the trigger writes whichever
  set matches the provider somebody actually used.

  Identity collision is handled above this layer. Supabase links a second provider into an
  existing user when the provider hands back a verified email that already belongs to one,
  and all three of these do. Somebody signing in with GitHub on Monday and Discord on
  Friday lands on the same profile, and only the columns for the provider they used that
  day get refreshed.
*/

/*
  Text, not bigint. A Discord snowflake is a 64 bit number that will not survive a trip
  through a JavaScript Number, and this id only ever gets compared, never summed.
*/
alter table public.profiles
  add column if not exists discord_id text unique,
  add column if not exists discord_login text;

comment on column public.profiles.discord_id is
  'Discord user id, captured when Discord is the provider. Text because snowflakes exceed the safe integer range.';
comment on column public.profiles.discord_login is
  'Discord username at last sign in. Display only. Nothing keys off it, because Discord names change.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'github');
  provider_id text;
  login text;
  base text;
  candidate text;
  suffix integer := 0;
begin
  /*
    Each provider names the same two things differently. GitHub sends user_name, Discord
    and Twitch send preferred_username or nickname depending on the day. Reading all of
    them in order is uglier than picking one, and it is the difference between a handle
    seeded from somebody's name and a handle seeded from the left half of their email.
  */
  provider_id := nullif(coalesce(meta ->> 'provider_id', meta ->> 'sub'), '');
  login := lower(nullif(coalesce(
    meta ->> 'user_name',
    meta ->> 'preferred_username',
    meta ->> 'nickname'
  ), ''));

  base := coalesce(login, lower(split_part(coalesce(new.email, 'builder'), '@', 1)));

  base := regexp_replace(base, '[^a-z0-9-]', '-', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' or base is null then
    base := 'builder';
  end if;
  base := left(base, 32);

  candidate := base;
  while exists (select 1 from public.reserved_handles where handle = candidate)
     or exists (select 1 from public.profiles where handle = candidate) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  /*
    twitch_linked_at is set when Twitch is the way in, because signing in with Twitch is
    a link. The badge backfill keys on twitch_user_id and does not care how it got there,
    so somebody who signs in with Twitch gets their stream history without a second trip
    through the link flow.
  */
  insert into public.profiles (
    id, handle, display_name, avatar_url,
    github_id, github_login, github_created_at,
    discord_id, discord_login,
    twitch_user_id, twitch_login, twitch_linked_at
  )
  values (
    new.id,
    candidate,
    coalesce(meta ->> 'full_name', meta ->> 'name', base),
    meta ->> 'avatar_url',
    case when provider = 'github' then provider_id::bigint end,
    case when provider = 'github' then login end,
    case when provider = 'github' then nullif(meta ->> 'created_at', '')::timestamptz end,
    case when provider = 'discord' then provider_id end,
    case when provider = 'discord' then login end,
    case when provider = 'twitch' then provider_id end,
    case when provider = 'twitch' then login end,
    case when provider = 'twitch' and provider_id is not null then now() end
  );

  insert into public.notification_prefs (profile_id) values (new.id);

  return new;
end;
$$;
