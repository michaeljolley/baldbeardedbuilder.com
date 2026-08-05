/*
  Seed data for the v2 tables.

  Two lists. The reserved handles, which are a correctness matter and are settled, and a
  starting set of badges, which is not.

  The badge names and thresholds below are a proposal, not a decision. They are here so
  the schema, the profile shelf and the backfill have something real to run against
  before Phase 6, and every threshold is written into the definition rather than into
  code so changing one is a data edit in Studio and not a deploy. Michael signs these off
  before launch.
*/

-- Reserved handles -------------------------------------------------------------------------

/*
  Two groups. The top level paths, because a handle that matches one is a handle somebody
  will link to by accident, and the words that would let a profile pretend to be part of
  the site rather than a person on it.
*/
insert into public.reserved_handles (handle) values
  ('404'), ('about'), ('admin'), ('administrator'), ('api'), ('auth'), ('bbb'),
  ('baldbeardedbuilder'), ('blog'), ('builder'), ('builders'), ('conduct'), ('contact'),
  ('dev-disasters'), ('drip'), ('drips'), ('help'), ('images'), ('kitchen-sink'),
  ('login'), ('logout'), ('me'), ('michael'), ('michaeljolley'), ('moderator'), ('new'),
  ('official'), ('privacy'), ('report'), ('root'), ('rss'), ('search'), ('settings'),
  ('signin'), ('signout'), ('signup'), ('sitemap'), ('staff'), ('submit'), ('support'),
  ('system'), ('terms'), ('uses'), ('videos')
on conflict (handle) do nothing;

-- Badges ---------------------------------------------------------------------------------

/*
  Three categories, which is the whole grouping the shelf needs.

  presence  you were in the room
  craft     you made something
  care      you did something for somebody else

  Tone is the diagnostic colour, reusing the severity vocabulary so the shelf looks like
  the rest of the site rather than like a games console.
*/
insert into public.badges (id, name, description, category, tone, sort_order, is_manual) values
  -- presence, all backfilled from the Twitch history
  ('front-row',        'Front Row',        'Showed up to the live stream. Repeatedly.',                       'presence', 'info',    10, false),
  ('regular',          'Regular',          'Turned up to twenty five streams or more.',                       'presence', 'info',    20, false),
  ('day-one',          'Day One',          'Was there before the channel was any good.',                      'presence', 'hint',    30, false),
  ('talker',           'Talker',           'Said something in chat a hundred times over.',                    'presence', 'info',    40, false),
  ('raider',           'Raider',           'Brought their whole audience along.',                             'presence', 'warning', 50, false),
  ('subscriber',       'Subscriber',       'Paid for something that was already free.',                       'presence', 'warning', 60, false),
  ('gifter',           'Gifter',           'Paid for somebody else to have it.',                              'presence', 'error',   70, false),

  -- craft, all earned on the site
  ('confessor',        'Confessor',        'Owned up to a dev disaster in public.',                           'craft',    'warning', 110, false),
  ('serial-confessor', 'Serial Confessor', 'Owned up five times. Concerning, honestly.',                       'craft',    'error',   120, false),
  ('took-prod-down',   'Took Prod Down',   'Filed a disaster that earned an Error.',                          'craft',    'error',   130, false),
  ('featured',         'Featured',         'A story good enough to put on the front page.',                   'craft',    'error',   140, true),

  -- care, earned on the site
  ('first-reply',      'First Reply',      'Answered somebody. That is how this works.',                      'care',     'info',    210, false),
  ('helpful',          'Helpful',          'Replied on twenty five different threads.',                       'care',     'info',    220, false),
  ('good-neighbour',   'Good Neighbour',   'Made this place better in a way a query cannot measure.',         'care',     'hint',    230, true)
on conflict (id) do nothing;

/*
  Thresholds, kept out of application code so they can be tuned without a deploy. Read by
  the backfill job in Phase 6 and by the grant checks in Phase 5.

  event is a streamEvents.eventType for the backfilled badges, or a site side counter
  name for the earned ones. Null means the badge is granted by hand.
*/
create table public.badge_rules (
  badge_id text primary key references public.badges (id) on delete cascade,
  event text not null,
  threshold integer not null default 1,
  constraint badge_rules_threshold_positive check (threshold > 0)
);

alter table public.badge_rules enable row level security;
/* No policies. Publishing the thresholds turns badges into a to do list. */

insert into public.badge_rules (badge_id, event, threshold) values
  ('front-row',        'stream:attended',   5),
  ('regular',          'stream:attended',   25),
  ('day-one',          'stream:early',      1),
  ('talker',           'onChatMessage',     100),
  ('raider',           'twitch:raid',       1),
  ('subscriber',       'twitch:sub',        1),
  ('gifter',           'twitch:giftsub',    1),
  ('confessor',        'site:disaster',     1),
  ('serial-confessor', 'site:disaster',     5),
  ('took-prod-down',   'site:disaster-error', 1),
  ('first-reply',      'site:comment',      1),
  ('helpful',          'site:comment-thread', 25)
on conflict (badge_id) do nothing;
