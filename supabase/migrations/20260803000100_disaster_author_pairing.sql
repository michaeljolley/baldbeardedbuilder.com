-- Decision 105. A story is either anonymous or it has an author.
--
-- deleteAccount() is correct today only by convention. It writes author_id null and
-- is_anonymous true in the same update, and nothing anywhere enforces that they move
-- together. Split them and the row still saves: author_id null with is_anonymous false is
-- a story that claims to have a named teller and cannot name one.
--
-- That state renders as no byline at all, which is neither of the two things the site says
-- about a story. It is not "anonymous", because the teller never chose that, and it is not
-- a name. tellerFor() in src/lib/disasters.ts treats it as damage and warns, which is the
-- right reading of a row that should not exist. This constraint is what makes it not
-- exist.
--
-- One interaction worth knowing before it surprises somebody. disasters.author_id is
-- "references public.profiles (id) on delete set null", so deleting a profile row directly
-- sets author_id to null and leaves is_anonymous alone. With this constraint in place that
-- delete now fails rather than quietly producing the row described above. That is the
-- point, and the recovery is one statement:
--
--   update public.disasters set is_anonymous = true, author_id = null
--   where author_id = '<profile id>';
--
-- The supported path already does exactly that. Account deletion in the app anonymises the
-- stories first, so it is unaffected.

alter table public.disasters
  add constraint disasters_author_pairing
  check (is_anonymous or author_id is not null);

comment on constraint disasters_author_pairing on public.disasters is
  'A story is either anonymous or it has an author. Stops author_id and is_anonymous drifting apart, which would draw a story with no byline and no stated reason for having none.';
