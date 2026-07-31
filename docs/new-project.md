# Standing up the new Supabase project

Everything Michael has to do by hand before v2 can talk to a database, in the order it has
to happen, with the exact value that comes out of each step and where that value goes.

The v2 site gets a **brand new Supabase project**. It does not share one with the current
site. `bvyerlczpakdlfvybkev` keeps serving the live site, `bbb.dev` short links and 24,574
rows of stream history, and it is not v2's. Nothing in this document points at it.

Read `supabase/README.md` for what the schema is. This is only the click by click.

---

## Before you start, one thing that is easy to get wrong

**The `bbb.dev` short link rule in `netlify.toml` must keep pointing at the old project.**

```
https://bvyerlczpakdlfvybkev.supabase.co/functions/v1/redirect?path=:splat
```

`shorturls` lives there, deliberately, and it is not being copied. That line looks like a
leftover and it is not. Repointing it at the new ref makes 1,627 short links 404 with no
error raised anywhere, because the table would simply not exist. Leave it alone.

---

## Step 1. Create the project

In the Supabase dashboard, **New project**.

| Field | Value | Why |
|---|---|---|
| Organisation | The same one that owns `bvyerlczpakdlfvybkev` | Keeps billing and access in one place. Nothing technical depends on it |
| Name | `baldbeardedbuilder-v2` | `supabase/config.toml` sets `project_id = "baldbeardedbuilder"`, which is only the local dev container name. The dashboard name is free |
| Region | **East US (North Virginia)**, `us-east-1` | This one does matter. Netlify functions default to `us-east-1`, and every write on this site goes through an on demand route rather than from the browser. A project in Europe puts a transatlantic round trip inside the request that posts a comment |
| Postgres version | 17 | Matches `major_version = 17` in `config.toml`. Take the default if it is already 17 |
| Database password | Generate one, store it in the password manager | Needed by `supabase db push`. You will be asked for it once |

Wait for it to finish provisioning before going further. `db push` against a project that
is still coming up fails in a way that looks like a permissions problem.

**What you get back:** the project ref, a 20 character string. It is in the dashboard URL,
`https://supabase.com/dashboard/project/<ref>`.

---

## Step 2. Push the schema

From the repo root, on the `v2` branch:

```
supabase link --project-ref <the-new-ref>
supabase db push
```

That is the whole thing. Push the entire chain, baseline included.

**Do not run `supabase migration repair`.** Older notes said to, and they were right when
the baseline was a copy of a schema that already existed. It is not that any more. It is
trimmed down to the two legacy tables v2 genuinely reads, `streamEvents` and
`streamUsers`, and it has to actually execute. Marking it applied without running it
leaves those tables missing and every badge migration lands on nothing.

Both tables arrive empty. `docs/backfill.md` is the spec for filling them, and it is worth
reading before the load rather than during it.

**Check it worked:** the dashboard table editor should show fifteen tables, and seventeen
migrations applied.

```
badges            badge_rules       badge_grants      bans
comments          disasters         likes
notification_prefs                  profiles          reports
reserved_handles  streamEvents      streamUsers
video_pages       video_transcripts
```

No `email_outbox`, and that is correct. v1 sends no email, so
`supabase/deferred/20260801000100_notifications.sql` is held out of the chain. See
`docs/notifications.md`. `notification_prefs` is in the base schema and does arrive: it
gets a row per profile and nothing reads or writes it.

`streamEvents` and `streamUsers` keep their camel case quoting from the legacy schema.
That is not a slip, it is what the columns the badge engine queries are actually called.

---

## Step 3. Collect the three values the site needs

Dashboard, **Project Settings**, **API**.

| Dashboard label | Goes into | Scope |
|---|---|---|
| Project URL, `https://<ref>.supabase.co` | `PUBLIC_SUPABASE_URL` | Public. Safe in the browser |
| `anon` `public` key | `PUBLIC_SUPABASE_ANON_KEY` | Public. Safe in the browser |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` | **Never** prefixed `PUBLIC_`. Server only |

The `service_role` key bypasses row level security completely. Every write on this site
uses it from an API route, which is why the RLS policies are read only. If it ever reaches
a browser bundle, anybody can write anything. The `PUBLIC_` prefix is the only thing Astro
uses to decide what ships to the client, so the naming is the guard rail.

---

## Step 4. The GitHub OAuth app

**This needs a new OAuth app, not an edit to the existing one.**

A GitHub OAuth App has a single Authorization callback URL field. The callback is
`https://<ref>.supabase.co/auth/v1/callback` and the ref is changing, so one app cannot
serve both projects. Editing the existing app would repoint the old project's sign in at
the new one. Leave it alone and make a second app.

GitHub, **Settings**, **Developer settings**, **OAuth Apps**, **New OAuth App**.

| Field | Value |
|---|---|
| Application name | `Bald Bearded Builder` |
| Homepage URL | `https://baldbeardedbuilder.com` |
| Authorization callback URL | `https://<ref>.supabase.co/auth/v1/callback` |

Generate a client secret. You get a client id and a secret.

Then in Supabase, **Authentication**, **Sign In / Providers**, **GitHub**: enable it and
paste both. `supabase/config.toml` names these `SUPABASE_AUTH_GITHUB_CLIENT_ID` and
`SUPABASE_AUTH_GITHUB_SECRET`, but those names are only used when running Supabase
locally. On a hosted project they are dashboard fields, not environment variables.

Nothing else needs enabling. Email sign up is off on purpose, per decision 4. Nobody signs
up with a password, so there is no password to leak, reset or stuff.

---

## Step 5. The Twitch app, at the same time and not later

Twitch is not a way to sign in. Nothing on the site offers it. It exists so a signed in
person can link their Twitch account, and the only reason that matters on day one is that
**linking captures `profiles.twitch_user_id`**.

That capture has to be working from the first sign in. `streamEvents.login` is a Twitch
login, and logins change. If ids are only captured once the badge job exists, then
everybody who linked before that and later changed their name is unmatchable, and it shows
up as an empty badge shelf rather than as an error. This is why it goes in now, with no
stream data loaded and no badges to grant yet.

Twitch developer console, **Register Your Application**.

| Field | Value |
|---|---|
| Name | `Bald Bearded Builder` |
| OAuth Redirect URLs | `https://<ref>.supabase.co/auth/v1/callback` |
| Category | Website Integration |

Unlike GitHub, **Twitch allows several redirect URLs on one application**, so if there is
already a Twitch app you can add the new callback to it rather than registering another.

Then in Supabase, **Authentication**, **Sign In / Providers**, **Twitch**: enable it and
paste the client id and secret. It has to be enabled at the provider level even though
nothing signs in with it, because `linkIdentity` refuses to link a provider that is off.

---

## Step 6. Redirect URLs, which is the step everybody forgets

Supabase, **Authentication**, **URL Configuration**.

The sign in route builds its `redirectTo` from `url.origin`, so it always returns to
whatever host the request arrived on. That is what makes staging work at all, and it means
Supabase has to be told every host that is allowed to be returned to. Anything not on this
list silently redirects to the Site URL instead, which looks like "signing in on the
branch deploy sends me to production".

| Setting | Value |
|---|---|
| Site URL | `https://baldbeardedbuilder.com` |
| Redirect URLs | `https://baldbeardedbuilder.com/**` |
| | `https://**--baldbeardedbuilder.netlify.app/**` |
| | `http://localhost:4321/**` |

The middle one is a wildcard covering every Netlify branch and deploy preview URL. Replace
`baldbeardedbuilder` with the actual Netlify site name if it differs; it is the subdomain
on the `.netlify.app` URL of the current site.

Both callback paths are covered by the `/**` suffix: `/auth/callback` for sign in and
`/auth/link/twitch/callback/` for the Twitch link.

---

## Step 7. Netlify environment variables

Netlify, **Site configuration**, **Environment variables**.

Everything below is scoped to **all deploy contexts**: production, deploy previews and
branch deploys. There is one Supabase project, so staging and production share it. That is
a deliberate simplification and it has one consequence worth naming out loud: a comment
posted on the branch deploy is a real comment on the real site. Test with that in mind.

| Name | Value | Secret |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | No |
| `PUBLIC_SUPABASE_ANON_KEY` | the `anon` key from step 3 | No |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key from step 3 | **Yes** |
| `LIKE_IP_SECRET` | any long random string you generate | **Yes** |

Mark the secret ones as secret in Netlify so their values are hidden after saving.

`LIKE_IP_SECRET` is the HMAC key behind `likes.ip_hash`. It is rotatable and rotating it
loses nothing: it just means somebody who already liked a thing could like it once more.
The column is a dedupe token with a shelf life, not a stored IP address.

`NOTIFY_SECRET`, `RESEND_API_KEY` and `MAIL_FROM` are deliberately not on this list. v1
sends no email of any kind, so there is nothing to configure and nothing for you to
choose a sender for. Setting any of them on its own turns on half a feature whose other
half is the copy on submit, terms and privacy saying plainly that nothing is sent.
`docs/notifications.md` is the whole procedure if that ever changes.

---

## Step 8. Local `.env`, for whoever is developing

Not committed. Same values, plus one the deploy does not need.

```
PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_PROJECT_REF=<ref>
LIKE_IP_SECRET=<any long random string>
```

`SUPABASE_PROJECT_REF` is only read by `pnpm types`, which rewrites
`src/lib/supabase/database.types.ts` from the live schema. That script refuses to run
against the legacy ref.

---

## Step 9. Regenerate the types and commit them

```
pnpm types
pnpm check
```

`database.types.ts` is currently stale and cannot be regenerated until the project exists,
which is why new schema lives in `src/lib/supabase/pending.types.ts` with a cast at each
call site. Once `pnpm types` has run for real, those casts come out.

Commit the result. CI and a fresh clone must never need a Supabase login.

**Do not run `pnpm types` between now and the reversal migration executing against
`bvyerlczpakdlfvybkev`.** A types file regenerated from that project after the reversal
shows every v2 table missing, which looks exactly like somebody deleted the schema.

---

## Order, and what blocks what

1. **Create the project.** Blocks everything.
2. **Push the schema.** Needs the ref.
3. **Collect the three API values.** Can be done any time after step 1.
4. **GitHub OAuth app**, then paste into Supabase. Needs the ref for the callback URL.
5. **Twitch app**, then paste into Supabase. Same.
6. **Redirect URLs.** Needs the Netlify site name. Do it before anybody tries to sign in
   on a branch deploy, or the failure looks like a bug in the site.
7. **Netlify variables.** Needs steps 3, and a redeploy to take effect.
8. **Local `.env`**, then `pnpm types`, then commit.

Steps 4, 5 and 6 are all "sign in does not work" if any one of them is missed, and they
fail in ways that look like each other. If sign in misbehaves, check all three before
looking at the code.

---

## Separately, and on Michael's timing

Thirteen v2 migrations were applied to `bvyerlczpakdlfvybkev` by mistake.
`supabase/reversal/20260731000000_remove_v2_from_legacy.sql` removes all of it and is
committed deliberately unrun, outside `migrations/` so `db push` can never pick it up.
Every affected row count was measured before it was written and the file states plainly
that it destroys nothing.

One piece of it is worth pulling forward and is separable from the rest. A `pg_cron` job
named `backfill-badges` runs there daily at 01:30 UTC. Measured: `profiles` is empty, so
the job iterates zero rows, writes nothing and returns 0. It is a confirmed no op **as
long as nobody signs in to a v2 deploy pointed at that ref.** Killing it is one statement:

```sql
select cron.unschedule('backfill-badges');
```
