-- Comments: rendered bodies, likeable comments, and a count the build can read.
--
-- Three things the first schema did not anticipate, all found while building the thread.

-- 1. Markdown is rendered once, when it is written, not on every read.
--
-- Decision 9 wants fenced code blocks in comments that look like code blocks everywhere
-- else on the site, which means a syntax highlighter. Running one on every read would put
-- a grammar bundle and its cold start in front of every reader of every thread, to redo
-- work that never changes between reads. Rendering on write pays it once, on the rare
-- path, and turns reading a thread into selecting text.
--
-- Nullable because every row that exists today predates it, and because a held comment
-- has nothing to show anyone yet.
alter table public.comments
  add column if not exists body_html text;

comment on column public.comments.body_html is
  'Sanitised HTML rendered from body_markdown at write time. Never trusted from a client, never rendered from markdown at read time.';

-- 2. Likes need a third target that comments do not.
--
-- The mockup puts a like on every comment. target_kind is shared by comments and likes,
-- and adding "comment" to it would also let somebody file a comment whose target is the
-- kind "comment", which is not a thing. The two tables have genuinely different domains,
-- so they get genuinely different types.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'like_target') then
    create type public.like_target as enum ('content', 'disaster', 'comment');
  end if;
end
$$;

-- like_counts reads the column being retyped, so Postgres refuses to touch it while the
-- view exists. The view stands aside and comes back exactly as it was.
drop view if exists public.like_counts;

alter table public.likes
  alter column target_kind type public.like_target
  using target_kind::text::public.like_target;

-- 3. The build needs reply counts without reading every comment.
--
-- Same reasoning as like_counts: a static page prints a number, and printing it should
-- not mean fetching a thread. Only visible comments count, because a tombstone is not a
-- reply and a held comment is not public yet.
create view public.like_counts
with (security_invoker = true)
as
select target_kind, target_key, count(*)::bigint as likes
from public.likes
group by target_kind, target_key;

revoke all on public.like_counts from anon, authenticated;
grant select on public.like_counts to service_role;

comment on view public.like_counts is
  'Like totals per target, read at build time so a card can print a number without a request.';

comment on type public.like_target is
  'What a like can point at. Wider than target_kind because a comment can be liked but cannot be commented on.';

create or replace view public.comment_counts
with (security_invoker = true)
as
select target_kind, target_key, count(*)::bigint as replies
from public.comments
where status = 'visible'
group by target_kind, target_key;

revoke all on public.comment_counts from anon, authenticated;
grant select on public.comment_counts to service_role;

comment on view public.comment_counts is
  'Visible reply count per target, read at build time so a card can print a number without loading a thread.';
