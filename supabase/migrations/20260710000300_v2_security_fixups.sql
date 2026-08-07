/*
  Security fixups, straight off the Supabase linter.

  Three things, all of them things the first pass got wrong rather than things the linter
  is being fussy about.

  1. comments_public and like_counts were security definer views. The reasoning was that
     they need to see rows the caller cannot, which was true but was solving the wrong
     problem. Nothing in a browser reads either of them. Comments and likes are served by
     API routes using the service role, which bypasses RLS anyway, so the views can be
     plain invoker views that are simply not granted to anon or authenticated. That gets
     the same result with none of the blast radius a definer view carries if somebody
     later adds a column to it without thinking.

  2. The three trigger functions were callable over the REST API as RPC by anonymous
     visitors. Calling a trigger function directly raises rather than doing anything, so
     this was not exploitable, but a security definer function reachable by anon is a
     loaded gun left on a table. Execute is revoked.

  3. touch_updated_at ran with a mutable search_path, which is how a security definer
     function elsewhere in the schema gets tricked into calling somebody else's now().
     It is not definer, but there is no reason to leave it mutable.
*/

-- 1. Views become invoker, and stay unreachable from the browser -------------------------

drop view if exists public.comments_public;
drop view if exists public.like_counts;

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
  case when c.status = 'visible' then c.body_markdown end as body_markdown,
  case when c.status = 'visible' then c.author_id end as author_id,
  case when c.status = 'visible' then p.handle end as author_handle,
  case when c.status = 'visible' then p.display_name end as author_name,
  case when c.status = 'visible' then p.avatar_url end as author_avatar
from public.comments c
left join public.profiles p on p.id = c.author_id
where c.status in ('visible', 'hidden', 'deleted');

create view public.like_counts
with (security_invoker = true)
as
select target_kind, target_key, count(*)::bigint as likes
from public.likes
group by target_kind, target_key;

revoke all on public.comments_public from anon, authenticated;
revoke all on public.like_counts from anon, authenticated;

-- 2. Trigger functions are not RPC endpoints ----------------------------------------------

revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.comments_enforce_one_level() from anon, authenticated, public;
revoke execute on function public.reports_auto_hide() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;

-- 3. Pin the search path --------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from anon, authenticated, public;
