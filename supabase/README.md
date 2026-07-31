# Supabase

The database behind the site. Project ref `bvyerlczpakdlfvybkev`.

## First run

```
supabase link --project-ref bvyerlczpakdlfvybkev
supabase migration repair --status applied 20260101000000
```

That second line matters. `20260101000000_baseline.sql` is the schema as it already
exists on production, reconstructed from the catalog because it was originally built
through Studio and through six migrations that were never checked in anywhere. Pushing
it would try to create tables that are already there. Repairing it marks it applied and
lets everything after it line up.

After that, `supabase db reset` gives you a local database that looks like the real one,
and `supabase db push` sends only what is genuinely new.

## What is here

| Migration | What it does |
|---|---|
| `20260101000000_baseline` | The pre existing schema. Already applied. Do not push, do not edit |
| `20260710000000_v2_schema` | Profiles, bans, disasters, comments, likes, reports, badges, notification preferences |
| `20260710000100_v2_rls` | Row level security. Deny by default, reads added back one at a time |
| `20260710000200_v2_seed` | Reserved handles, and a starting set of badges and thresholds |
| `20260710000300_v2_security_fixups` | Closes two advisor errors and takes the trigger functions off the RPC surface |
| `20260710000400_badge_tiers` | Badge families and tiers, so a shelf can show "Front Row III" and a locked IV |
| `20260710000500_streams_watched` | `streams_watched` and `twitch_first_seen`, the two numbers a profile cannot get from PostgREST |
| `20260710000600_comment_cascade_fix` | Stops one account deletion hard deleting other people's replies |

## Regenerating types

`pnpm types` rewrites `src/lib/supabase/database.types.ts` from the live schema. Run it
after every migration and commit the result, so CI and a fresh clone never need a Supabase
login. `pnpm check` is what catches you if you forget.

## How writes work

They go through Astro API routes using the service role, not from the browser.

That is a deliberate posture rather than an unfinished one. A like needs its IP hashed
with a secret the browser must never hold. A comment needs a rate limit and a check on
how old its author's GitHub account is. A submission needs a title written for it before
it means anything. None of that can be expressed as a row level policy, and a policy
permissive enough to allow the insert would be a policy permissive enough to skip all of
it.

So the policies in `20260710000100_v2_rls` are read only, with exactly two exceptions,
both called out in the file: a person editing their own profile, and a person changing
their own notification preferences. Both are safe to do directly and would otherwise cost
a route each for nothing.

## Environment

The build and the routes need these. Never commit them.

| Name | Where | Why |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Netlify, local `.env` | Client and server |
| `PUBLIC_SUPABASE_ANON_KEY` | Netlify, local `.env` | Client reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify only, never `PUBLIC_` | Route writes |
| `LIKE_IP_SECRET` | Netlify only | HMAC key for `likes.ip_hash` |
| `SUPABASE_AUTH_GITHUB_CLIENT_ID` / `_SECRET` | Supabase dashboard | Sign in |
| `SUPABASE_AUTH_TWITCH_CLIENT_ID` / `_SECRET` | Supabase dashboard | Link only identity |

`LIKE_IP_SECRET` is rotatable. Rotating it does not lose any likes, it just means the
people who already liked something could like it once more. That is the intended
tradeoff: the column is a dedupe token with a shelf life, not a stored IP address.

## Things worth knowing

**Disasters have no topic column, on purpose.** Decision 35 says severity and the
diagnostic id are the whole classification. Adding a topic later would undo that quietly
rather than loudly.

**Comments are keyed by collection id, never by URL.** A URL contains a topic, topics are
a judgement recorded in `src/config/taxonomy.json`, and that judgement will get revised.
The conversation has to survive that.

**Twitch is matched on user id, not login.** `streamEvents.login` is a Twitch login and
logins change. Matching by name would silently drop exactly the long time community
members the badge backfill exists to reward, and it would show up as an empty shelf
rather than as an error. The id is captured at link time into `profiles.twitch_user_id`.

**The badge names and thresholds are a proposal.** They live in `badges` and
`badge_rules` rather than in code so tuning one is an edit in Studio, not a deploy. They
need signing off before launch.

**Moderation happens in Studio.** Decision 7. There is no admin UI in v1, which is why
`disasters.status`, `comments.status` and `reports.status` are plain text columns with
readable values rather than integers or enums.
