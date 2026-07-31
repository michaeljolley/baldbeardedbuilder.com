-- Account deletion must not delete other people's words.
--
-- Two cascades in the first schema conspired into a real bug. comments.author_id
-- cascaded from profiles, and comments.parent_id cascaded from comments. Put together,
-- one person deleting their account would hard delete every comment they had ever
-- written, and every reply anybody else had written underneath those comments. A person
-- exercising their right to leave should not be able to silently erase a conversation
-- other people are still part of.
--
-- Decision 16 already settled the shape: a removed comment is a tombstone, not a hole.
-- This makes the foreign keys agree with that.

alter table public.comments
  alter column author_id drop not null;

alter table public.comments
  drop constraint if exists comments_author_id_fkey;

alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

-- A comment with replies cannot be hard deleted at all. The only correct way to remove
-- one is to mark it deleted, which keeps the thread readable. Making the database refuse
-- turns a policy into a guarantee.
alter table public.comments
  drop constraint if exists comments_parent_id_fkey;

alter table public.comments
  add constraint comments_parent_id_fkey
  foreign key (parent_id) references public.comments (id) on delete restrict;

comment on column public.comments.author_id is
  'Null once the author deleted their account. The comment stays as a tombstone so replies keep their context.';

-- comments_public has to know the difference between "this person took their comment
-- down" and "this person is gone", because they read differently to everybody else in
-- the thread.
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
    when c.status = 'visible' then p.handle
    when c.author_id is null then null
    else null
  end as author_handle,
  case when c.status = 'visible' then p.display_name else null end as author_name,
  case when c.status = 'visible' then p.avatar_url else null end as author_avatar,
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
  'Comment thread shape with bodies hidden for anything not visible. Read by the API routes, never by a browser.';
