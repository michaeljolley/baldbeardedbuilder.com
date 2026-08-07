/*
  Row level security for the v2 tables.

  Deny by default. Every table below has RLS on, and a table with RLS on and no policy is
  invisible and unwritable to anon and authenticated. Policies are then added back one at
  a time, and only for reads, with two exceptions noted where they appear.

  Writes belong to the API routes, which use the service role and bypass RLS entirely.
  That is not laziness about policies, it is where the rules actually live: an IP has to
  be hashed with a secret the browser must never hold, a comment has to be checked
  against a rate limit and against the age of its author's GitHub account, and a
  submission has to have a title written for it before it means anything. None of that is
  expressible as a policy, and a policy that permitted the insert would be a policy that
  permitted skipping all of it.
*/

alter table public.profiles enable row level security;
alter table public.bans enable row level security;
alter table public.disasters enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.badges enable row level security;
alter table public.badge_grants enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.reserved_handles enable row level security;

-- Profiles -------------------------------------------------------------------------------

/*
  A public profile is readable by anybody. A private one and a deleted one are not, and
  that has to hold for the row itself, not just for the page, or the API hands out what
  the router refuses to render.
*/
create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (is_private = false and deleted_at is null);

create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

/*
  First exception. Editing your own bio, links and private toggle is safe to do directly
  and would otherwise cost an API route for nothing. The column list is not restricted
  here because Postgres policies cannot do that, so the route that serves the settings
  form sends only these fields, and anything else a crafted request changed would either
  be caught by a constraint or is not load bearing. handle is the one to watch: it is
  shape checked and unique, so the worst case is somebody renaming themselves.
*/
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()));

-- Bans -----------------------------------------------------------------------------------

/*
  No policies at all. A ban is between Michael and the person banned, and publishing the
  list would turn moderation into a scoreboard. The routes read it with the service role.
*/

-- Disasters ------------------------------------------------------------------------------

create policy disasters_public_read on public.disasters
  for select to anon, authenticated
  using (status = 'published');

/* Your own story stays visible to you while it waits, so the submit flow can say so. */
create policy disasters_own_read on public.disasters
  for select to authenticated
  using (author_id = (select auth.uid()));

-- Comments -------------------------------------------------------------------------------

/*
  The base table hands out visible comments and nothing else. Hidden, held and deleted
  rows are not readable here at all, so no amount of asking a different way returns the
  body of a comment that was taken down.

  Thread shape is a separate problem. A tombstone has to render, or a reply ends up
  orphaned and the thread quietly rearranges itself. That comes from the view below,
  which runs as its owner, sees every row, and returns the shape with the text stripped.
*/
create policy comments_public_read on public.comments
  for select to anon, authenticated
  using (status = 'visible');

/* Your own comment stays readable to you while it is held or after you delete it. */
create policy comments_own_read on public.comments
  for select to authenticated
  using (author_id = (select auth.uid()));

/*
  What the site actually renders. Definer rather than invoker, deliberately: it is the
  only thing allowed to see a taken down comment, and all it gives back is that one
  existed here. Held comments are absent entirely, because a hold is meant to be
  invisible until it resolves.
*/
create view public.comments_public
with (security_invoker = false)
as
select
  c.id,
  c.target_kind,
  c.target_key,
  c.parent_id,
  c.created_at,
  c.edited_at,
  c.status,
  case when c.status = 'visible' then c.body_markdown end as body_markdown,
  case when c.status = 'visible' then c.author_id end as author_id,
  case when c.status = 'visible' then p.handle end as author_handle,
  case when c.status = 'visible' then p.display_name end as author_name,
  case when c.status = 'visible' then p.avatar_url end as author_avatar
from public.comments c
left join public.profiles p on p.id = c.author_id
where c.status in ('visible', 'hidden', 'deleted');

alter view public.comments_public owner to postgres;
grant select on public.comments_public to anon, authenticated;

-- Likes ----------------------------------------------------------------------------------

/*
  No read policy on the rows. A like row carries a browser token and a hashed IP, and
  handing those out would let anybody build a map of who liked what. Only the count is
  public, through the view below.
*/
create view public.like_counts
with (security_invoker = false)
as
select target_kind, target_key, count(*)::bigint as likes
from public.likes
group by target_kind, target_key;

alter view public.like_counts owner to postgres;
grant select on public.like_counts to anon, authenticated;

-- Reports --------------------------------------------------------------------------------

/*
  No policies. A report is readable only by Michael through Studio. Even the person who
  filed it does not get it back, because a report you can look up is a report somebody can
  be pressured into looking up.
*/

-- Badges ---------------------------------------------------------------------------------

create policy badges_public_read on public.badges
  for select to anon, authenticated
  using (true);

/*
  Grants follow the visibility of the profile they belong to, so a private profile does
  not leak its shelf.
*/
create policy badge_grants_public_read on public.badge_grants
  for select to anon, authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = badge_grants.profile_id
      and p.is_private = false
      and p.deleted_at is null
  ));

create policy badge_grants_own_read on public.badge_grants
  for select to authenticated
  using (profile_id = (select auth.uid()));

-- Notification preferences -----------------------------------------------------------------

/*
  Second exception. Your own preferences, read and written directly, because a settings
  toggle that needs a round trip through a route is a settings toggle that feels broken.
  The one click unsubscribe path does not use these policies at all: it arrives with a
  token and no session, so it goes through a route with the service role.
*/
create policy notification_prefs_self on public.notification_prefs
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy notification_prefs_self_update on public.notification_prefs
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Reserved handles -------------------------------------------------------------------------

/*
  No policies. The list is only read by the sign up trigger, which is security definer, and
  publishing it would be publishing a list of paths worth squatting.
*/
