-- Going private hides the name on comments too.
--
-- Michael's ruling is that going private hides the name everywhere. The dev disaster wall
-- was fixed in application code, because that byline is resolved by a query this repo
-- owns. Comment bylines are not: they come out of comments_public, which left joins
-- profiles, so the fix belongs in the view.
--
-- Why security_invoker on this view was not already enough. It means the view runs with
-- the caller's permissions, so RLS on profiles applies and a private profile's handle
-- comes back null. That holds for anon and authenticated, neither of which can read this
-- view at all. It does not hold for the service role, which bypasses RLS entirely, and the
-- service role is the only grantee. readThread() in src/lib/comments.ts reads this view
-- with the service role, so the sole reader of these bylines is the sole reader RLS never
-- covered. Same shape as the disasters fix: a service role query feeding a public surface
-- has to restate the predicate, because it does not inherit one.
--
-- Restating it here rather than in readThread() covers every caller, including any added
-- later, and keeps the rule next to the join it constrains.
--
-- display_name and avatar_url go with the handle. Somebody who has gone private is not
-- hidden by removing one of the three things that name them.
--
-- Three things are deliberately unchanged. author_id is an id rather than an identity, is
-- already gated on status, and nothing renders it. The tombstone still tells a private
-- person's readers what happened, because it says a comment was removed rather than who
-- wrote it. And there is still no where clause, because a deleted row has to reach the
-- thread to draw its tombstone.

drop view if exists public.comments_public;

create view public.comments_public
with (security_invoker = true)
as
select
  c.id,
  c.target_kind,
  c.target_key,
  c.parent_id,
  c.created_at,
  c.edited_at,
  c.status,
  case when c.status = 'visible' then c.body_markdown else null end as body_markdown,
  case
    when c.status <> 'visible' then null
    else c.author_id
  end as author_id,
  case
    when c.status = 'visible' and p.is_private = false and p.deleted_at is null
    then p.handle
    else null
  end as author_handle,
  case
    when c.status = 'visible' and p.is_private = false and p.deleted_at is null
    then p.display_name
    else null
  end as author_name,
  case
    when c.status = 'visible' and p.is_private = false and p.deleted_at is null
    then p.avatar_url
    else null
  end as author_avatar,
  case
    when c.status = 'visible' then null
    when c.author_id is null then 'account deleted'
    else 'comment removed'
  end as tombstone
from public.comments c
left join public.profiles p on p.id = c.author_id;

revoke all on public.comments_public from anon, authenticated;
grant select on public.comments_public to service_role;

comment on view public.comments_public is
  'Comment thread shape with bodies hidden for anything not visible and bylines hidden for private or deleted profiles. Read by the API routes with the service role, never by a browser.';
