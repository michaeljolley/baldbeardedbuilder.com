/*
  Badge thresholds, rescaled to the history that actually exists.

  The first pass at these numbers was written before anybody looked at the data, and the
  data says the top tier was unreachable. There are 113 recorded streams spanning June
  2025 to May 2026, and the most anybody attended is 68. A badge at a hundred streams is
  not aspirational, it is a badge nobody can ever have, and a shelf with a permanently
  dark plaque on it teaches people the shelf is decoration.

  Measured distribution of distinct streams attended, out of 1,854 people:

      5 or more   125
     15 or more    38
     30 or more    19
     50 or more     6
    100 or more     0

  And of chat messages sent:

      50 or more    51
     250 or more    11
    1000 or more     2

  The tiers below follow those curves. Roughly a hundred people clear tier one, a few
  dozen clear tier two, a couple of dozen clear tier three, and a handful clear tier four.
  That is the shape a shelf wants: the first one feels reachable and the last one means
  something.
*/

-- Front row, scaled from 5 / 25 / 50 / 100 to 5 / 15 / 30 / 50 -------------------------

update public.badges set description = 'Turned up to five streams live.'        where id = 'front-row';
update public.badges set description = 'Turned up to fifteen streams live.'     where id = 'front-row-2';
update public.badges set description = 'Turned up to thirty streams live.'      where id = 'front-row-3';
update public.badges set description = 'Turned up to fifty streams live.'       where id = 'front-row-4';

update public.badge_rules set threshold = 15 where badge_id = 'front-row-2';
update public.badge_rules set threshold = 30 where badge_id = 'front-row-3';
update public.badge_rules set threshold = 50 where badge_id = 'front-row-4';

-- Talker, which was one flat badge and wanted the same treatment -----------------------

update public.badges
   set family = 'talker', tier = 1, description = 'Said something in chat fifty times over.'
 where id = 'talker';

update public.badge_rules set threshold = 50 where badge_id = 'talker';

insert into public.badges (id, name, description, category, tone, sort_order, is_manual, family, tier) values
  ('talker-2', 'Talker', 'Said something in chat two hundred and fifty times over.', 'presence', 'info',    41, false, 'talker', 2),
  ('talker-3', 'Talker', 'Said something in chat a thousand times over.',            'presence', 'warning', 42, false, 'talker', 3)
on conflict (id) do nothing;

insert into public.badge_rules (badge_id, event, threshold) values
  ('talker-2', 'onChatMessage', 250),
  ('talker-3', 'onChatMessage', 1000)
on conflict (badge_id) do nothing;

/*
  Cheering is its own kind of support and the history has it, but nothing on the shelf
  recognised it. Five people, which makes it rare without making it unreachable.
*/
insert into public.badges (id, name, description, category, tone, sort_order, is_manual, family, tier) values
  ('cheerer', 'Cheerer', 'Threw bits at the screen. Repeatedly, in some cases.', 'presence', 'warning', 65, false, 'cheerer', 1)
on conflict (id) do nothing;

insert into public.badge_rules (badge_id, event, threshold) values
  ('cheerer', 'twitch:cheer', 1)
on conflict (badge_id) do nothing;

/*
  Day One needs a definition rather than a threshold, because "early" is a date and not a
  count. It is the first ninety days of recorded history, computed from the earliest
  stream rather than hard coded, so the meaning does not drift if older events are ever
  imported. 336 people qualify, which is right for a badge that says you were here before
  it was any good.
*/
update public.badges
   set description = 'Was there in the first ninety days, before the channel was any good.'
 where id = 'day-one';

-- Matching a linked account to the history ---------------------------------------------

/*
  streamEvents and streamUsers key on a Twitch login, and logins change. Matching a linked
  account by login silently drops anybody who renamed, which shows up as an empty shelf
  for exactly the long time community members the backfill exists to reward.

  So streamUsers gains a stable id. It is nullable, because nothing can fill it in for
  historical rows without a call to Twitch, and the backfill prefers it when it is there
  and falls back to the login when it is not. The grant records which happened, so a shelf
  built on a guess is visible as one.
*/
alter table public."streamUsers" add column if not exists twitch_user_id text;

create unique index if not exists stream_users_twitch_id_idx
  on public."streamUsers" (twitch_user_id)
  where twitch_user_id is not null;
