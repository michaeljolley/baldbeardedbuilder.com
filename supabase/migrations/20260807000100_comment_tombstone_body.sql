-- A tombstone has no body, and the schema would not let it have none.
--
-- comments_body_length has been "char_length(body_markdown) between 1 and 10000" since the
-- v2 schema, unconditionally. Decision 16 says a removed comment is a tombstone rather than
-- a hole, and both places that make one write an empty body: deleteComment() in
-- src/lib/comments.ts, and deleteAccount() in src/lib/account.ts. Every one of those writes
-- was rejected by the check.
--
-- What that looked like from the outside: press Delete on your own comment, the update
-- fails, the endpoint answers 500 with "That did not save.", and the comment is still
-- there. Deleting an account was worse, because the comment update runs before the auth
-- user is removed and its failure aborts the whole thing. Somebody asking to leave was told
-- nothing was changed, which was true, and had no way to leave.
--
-- The constraint was never wrong about live comments. It was wrong about the one status
-- that is defined by not having a body. So it keeps the ceiling for every row and drops the
-- floor for a tombstone, rather than the app inventing a placeholder body to satisfy a
-- check, which would put words in a removed comment for no reason other than the schema
-- wanting some.
--
-- Nothing has to be backfilled. The rows that would have violated this are exactly the ones
-- that never saved.

alter table public.comments
  drop constraint if exists comments_body_length;

alter table public.comments
  add constraint comments_body_length
  check (
    char_length(body_markdown) <= 10000
    and (status = 'deleted' or char_length(body_markdown) >= 1)
  );

comment on constraint comments_body_length on public.comments is
  'A live comment has between 1 and 10000 characters. A deleted one is a tombstone, so its body is empty on purpose and the floor does not apply.';
