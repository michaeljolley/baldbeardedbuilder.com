/*
  Indexes for the badge counter.

  badge_counts filters streamEvents on lower(login), which without these is a sequential
  scan of twenty four thousand rows every time somebody loads a profile page. That is fast
  enough to hide in development and slow enough to notice once it is on every profile and
  every comment insert.

  lower(login) rather than login because logins arrive in whatever case Twitch felt like
  that day, and matching case sensitively would drop people for no reason anybody could see.
*/

create index if not exists stream_events_login_lower_idx on public."streamEvents" (lower(login));
create index if not exists stream_events_type_login_idx on public."streamEvents" (lower(login), "eventType");
create index if not exists stream_users_login_lower_idx on public."streamUsers" (lower(login));
