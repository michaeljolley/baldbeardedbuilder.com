-- Decision 122. Share intents, and the name is the decision.
--
-- We cannot observe a share. We observe a click on an affordance. For the four outbound
-- platforms the reader still has to press post in a window we do not control, and for copy
-- link we never learn what they did with it afterwards. A table called "shares" would be
-- read one day as four hundred people posted this, when what happened is four hundred
-- people opened a compose box.
--
-- So the table, the column and any dashboard label all say intent. This is the cheapest
-- possible moment to get that right, because renaming it later means renaming it in a place
-- somebody has already quoted a number from.
--
-- No user id, deliberately. The question this answers is which platforms move the needle,
-- and that needs a platform and a target, not a person. Recording who shared what turns a
-- share into a tracked personal action, which is exactly what decisions 104 and 105 spent
-- an evening walking back. Do not add one for badges later.

create table public.share_intents (
  id          bigint generated always as identity primary key,
  target_kind text not null check (target_kind in ('content', 'disaster')),
  target_key  text not null,
  platform    text not null check (platform in ('x', 'bluesky', 'linkedin', 'facebook', 'copy')),
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

/*
  ip_hash is the one column added to the shape decision 122 specified, and it is added
  because the rest of that decision asks for something the shape cannot do.

  The ruling says this gets the same rate limiting and abuse handling as /api/like. That
  limit is counted per address, deliberately, because a browser token is the one thing a
  script can forge freely. Counting per address means the previous hour of writes has to
  carry something derived from an address, and with the columns as listed there is nothing
  to count. The two halves of the decision could not both be true, so the smaller half
  moved.

  It is not the thing decision 122 excluded. That was a user id, which would name the
  person and turn a share into a tracked personal action. This is hashIp() from reader.ts,
  an HMAC under a rotatable secret, exactly as likes and reports already store. Rotating
  the secret forgets every address in here, which is the property that makes it a token
  with a shelf life rather than a record of where readers live.
*/

comment on table public.share_intents is
  'One row per press of a share control. An intent, not a share: nothing here proves anybody posted anything. No user id by design, see decisions 104, 105 and 122.';

comment on column public.share_intents.platform is
  'Where the reader was sent, or copy when they took the url themselves. copy is the one row we can never follow up on at all.';

comment on column public.share_intents.ip_hash is
  'HMAC of the address under LIKE_IP_SECRET, the same treatment likes and reports get. Present only so the rate limit can count the last hour. Rotating the secret forgets every address in here.';

-- Michael reads this by platform and by target. Nothing reads a single row.
create index share_intents_target_idx
  on public.share_intents (target_kind, target_key, created_at desc);

create index share_intents_platform_idx
  on public.share_intents (platform, created_at desc);

-- The rate limit query, which runs on every write and is the only hot read here.
create index share_intents_rate_idx
  on public.share_intents (ip_hash, created_at desc);

alter table public.share_intents enable row level security;

/*
  No policies at all, which means no policy grants anon or authenticated anything.

  Writes come from /api/share with the service role, the same as likes. Reads are Michael
  in Studio. A count of share intents is never shown to a reader, because it is his number
  rather than social proof, so there is nothing for a public read policy to serve.
*/
