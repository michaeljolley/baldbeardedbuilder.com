# Notifications, and why none of it is running

v1 sends no email. Not a notification, not a digest, not a reply alert, not a welcome.
There is no sender, no address to send from, and nothing draining the queue.

The code is still here, complete and unwired. This file is the reason, and it is the
instruction sheet for turning it on.

## Why it is here rather than deleted

Two reasons.

The thinking is worth more than the diff that removes it. Deciding that unsubscribe has
to work with no session, that a queue beats a direct send, that the address never gets
copied into a queue row so a deleted account cannot be emailed by a row that outlived
it, that the drain endpoint compares its secret in constant time. None of that is
obvious a second time.

And absent is a different problem to solve than broken. Somebody finding half a
notification system and no explanation concludes it is broken and starts debugging. The
headers on each file, and this page, say plainly that it is switched off on purpose.

## What is switched off

| Thing | State |
| --- | --- |
| `src/lib/mail.ts` | Present, unwired. `mailConfigured` is false with no `RESEND_API_KEY` |
| `src/lib/notify-templates.ts` | Present, unwired. Pure functions, still tested |
| `src/lib/notifications.ts` | Present, unwired. Nothing calls `drain()` |
| `src/pages/api/notifications.ts` | Present as a route, but refuses everything with no `NOTIFY_SECRET` set |
| `src/pages/_unwired/unsubscribe.astro` | Not a route. Astro excludes anything under an underscore prefixed directory |
| `supabase/deferred/20260801000100_notifications.sql` | Held out of the applied chain. `db push` reads `supabase/migrations/` only |
| `notification_prefs` | In the base schema, one row per profile, every column defaulting to true. Nothing reads it and nothing writes it |

`notification_prefs` staying is deliberate. An empty table promises nobody anything as
long as no interface reads it, and the defaults sitting at true mean whoever turns this
back on starts from the state that was designed.

## What did not come with it

Two things, and the second one nearly did.

`disasters.featured_at` was the first half of the notifications migration, because the
`story_featured` email needed something to key off. It is now
`supabase/migrations/20260801000000_featured.sql` and it stays in the applied chain.

Featuring is what the front page reads. `leadDisaster()` in `src/lib/disasters.ts` takes
the most recently featured published story and falls back to the newest. Holding that
column back would have quietly taken the front page lead with it, which is the kind of
thing a scope cut breaks by accident.

**The Featured badge grant went with it, and had to be pulled back separately.** It sat
inside `notify_disaster_change`, in the same branch that enqueued the `story_featured`
email, so deferring the email deferred the grant. The badge is seeded in
`20260710000200_v2_seed.sql`, so the result would have been a badge on the shelf that no
action could ever earn.

It is now its own trigger, `disasters_grant_featured`, keyed off the timestamp and
knowing nothing about mail. When the notifications migration comes back it must **not**
bring the grant with it: the deferred file has the branch removed and a comment saying
so, and `tests/no-email.test.mjs` asserts both halves. A duplicate grant would be hidden
by `on conflict do nothing` rather than reported.

This is the same shape as the bug that started all of this. A `story_featured` preference
existed for an event that no code path could produce, because the front page lead was
simply the newest row. Fixing that put the cause in the same function as the email, which
then made the cause deferrable. Worth remembering when reading the rest of this file:
what looks like an email feature here mostly is not.

## Turning it on

In this order.

1. **Choose a sender.** A domain, a from address, and an account at whoever sends it.
   `mail.ts` is written for Resend over plain `fetch`, so swapping the provider is one
   function. Set `RESEND_API_KEY` and `MAIL_FROM` in Netlify, scoped to production and
   to deploy previews if you want to test there.
2. **Apply the migration.** `supabase/deferred/20260801000100_notifications.sql`. Move it
   into `supabase/migrations/` first so it joins the chain properly rather than being
   run by hand, then `pnpm check:migrations` and `supabase db push`.
3. **Put the unsubscribe page back.** Move `src/pages/_unwired/unsubscribe.astro` to
   `src/pages/unsubscribe.astro`, and restore its two entries in `ON_DEMAND` in
   `scripts/a11y.mjs`, one with a token and one without.
4. **Wire the drain.** Set `NOTIFY_SECRET` and point a timer at `POST /api/notifications/`,
   either pg_cron through `net.http_post` or a Netlify scheduled function.
5. **Restore `saveAccount`.** `src/lib/account.ts` deliberately no longer writes
   `notification_prefs`, because a form with no switches posts no fields and reading them
   anyway turns every save into three falses nobody chose. Put the switches back in
   `src/pages/account.astro` and the upsert back in `saveAccount` in the same change.

## And change the copy back at the same time

This is the half that gets forgotten, so it is written out in full. Every one of these
currently says plainly that nothing is sent, and every one of them becomes a lie the
moment mail starts going out.

| File | What says it |
| --- | --- |
| `src/pages/submit.astro` | The `SENT` outcome map, the signed out sign in notice, the anonymous switch help text, and the "here's what happens next" panel |
| `src/pages/terms.astro` | The "What happens to a story after you send it" section |
| `src/pages/privacy.astro` | The `Email` row of the data table, the "Email sent: None" line in the summary rail, and the whole `Email` section |
| `src/pages/account.astro` | The switches, which were removed rather than disabled |
| `src/lib/account.ts` | `saveAccount`, and the `AccountView` type, which no longer carries `prefs` |

Copy that promises email while nothing sends it is the exact failure this scope cut
exists to avoid, at the exact moment somebody is deciding whether to hand over the worst
thing that ever happened to them at work. Do not restore one half without the other.

## The loop that email was carrying

Worth naming, because it is the real cost of the cut rather than the notifications
themselves. With no email, somebody submits a story and never learns what happened to
it. That closes without email by showing a person their own submissions and where each
one stands, which is why `disasters_own_read` exists in the RLS. See
`supabase/migrations/20260710000100_v2_rls.sql`.
