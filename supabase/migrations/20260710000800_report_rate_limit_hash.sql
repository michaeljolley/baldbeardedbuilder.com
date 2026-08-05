/*
  A hashed address on every report.

  Three reports auto hide a comment, so without a rate limit one person with a script can
  hide anything they like. The limit has to hold for anonymous reporters too, because
  reporting deliberately does not need an account, so it cannot key off the reporter id.

  Same one way hash as the anonymous like path uses. It cannot be turned back into an
  address and it is only ever compared against itself.
*/
alter table public.reports add column if not exists reporter_hash text;

create index if not exists reports_hash_recent_idx
  on public.reports (reporter_hash, created_at desc);
