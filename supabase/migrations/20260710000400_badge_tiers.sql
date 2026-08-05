/*
  Badge tiers.

  The profile mockup draws "Front Row III" as earned and "Front Row IV, 62 to go" as
  locked, which the first pass did not support. Badges were flat, so Front Row and
  Regular were two unrelated rows that happened to measure the same thing, and there was
  no way to render a next step at all.

  A tier is a row like any other. The family groups them, the tier orders them, and the
  threshold in badge_rules is what separates them. That keeps the shelf renderable with
  one query and keeps tuning a tier a data edit rather than a deploy.

  The locked plaque needs a next tier to point at, which falls out of the same data: the
  lowest tier in a family the reader has not earned.
*/

alter table public.badges
  add column family text,
  add column tier smallint;

alter table public.badges
  add constraint badges_tier_positive check (tier is null or tier > 0);

/* A family with two rows on the same tier has no order, which is a data bug. */
create unique index badges_family_tier_idx on public.badges (family, tier)
  where family is not null;

/* The flat badges become tier one of their own family. */
update public.badges set family = id, tier = 1 where family is null;

/*
  Front Row and Regular were the same badge wearing two names. They become tiers one and
  three of one family, with two new tiers filling the gaps the mockup implies.
*/
update public.badges set family = 'front-row', tier = 1, name = 'Front Row',
  description = 'Turned up to five streams live.'
  where id = 'front-row';

insert into public.badges (id, name, description, category, tone, sort_order, is_manual, family, tier) values
  ('front-row-2', 'Front Row', 'Turned up to twenty five streams live.',  'presence', 'info',    11, false, 'front-row', 2),
  ('front-row-3', 'Front Row', 'Turned up to fifty streams live.',        'presence', 'warning', 12, false, 'front-row', 3),
  ('front-row-4', 'Front Row', 'Turned up to a hundred streams live.',    'presence', 'error',   13, false, 'front-row', 4)
on conflict (id) do nothing;

insert into public.badge_rules (badge_id, event, threshold) values
  ('front-row-2', 'stream:attended', 25),
  ('front-row-3', 'stream:attended', 50),
  ('front-row-4', 'stream:attended', 100)
on conflict (badge_id) do nothing;

/* Regular was tier two of Front Row under a different name. Retire it. */
delete from public.badge_rules where badge_id = 'regular';
delete from public.badges where id = 'regular';

/* Confessor and Serial Confessor are the same duplication in a different category. */
update public.badges
   set family = 'confessor', tier = 2, name = 'Confessor'
 where id = 'serial-confessor';

update public.badges
   set family = 'confessor', tier = 1
 where id = 'confessor';

/* So are First Reply and Helpful. */
update public.badges
   set family = 'first-reply', tier = 2, name = 'First Reply'
 where id = 'helpful';

update public.badges
   set family = 'first-reply', tier = 1
 where id = 'first-reply';

/*
  The shelf, as one query. It carries every badge, whether this person has it, and how
  far off they are if they do not, so the page does not have to stitch three result sets
  together in JavaScript.

  Progress is left to the caller because the counters live in different places: stream
  attendance is in streamEvents, comments and disasters are here. What this view gives is
  the shape and the threshold.
*/
create view public.badge_shelf
with (security_invoker = true)
as
select
  b.id            as badge_id,
  b.family,
  b.tier,
  b.name,
  b.description,
  b.category,
  b.tone,
  b.sort_order,
  b.is_manual,
  r.event,
  r.threshold
from public.badges b
left join public.badge_rules r on r.badge_id = b.id;

revoke all on public.badge_shelf from anon, authenticated;
