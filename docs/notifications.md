# Email notifications

The site sends three transactional notifications:

| Type | Recipient | Event |
| --- | --- | --- |
| Story published | Story author | A submitted dev disaster first becomes published |
| Story featured | Story author | A published story first reaches the front page |
| Direct reply | Parent comment author | A visible comment directly replies to their comment |

Publishing and featuring in the same database change produces one featured message that
says both happened. Each type is sent at most once per story or reply. Notifications default
on for new accounts and can be changed separately on `/account/`.

The .NET Drip newsletter is separate. Signing in never subscribes somebody to it, and these
settings never change it.

## Delivery locks

Real delivery requires all of the following in the Netlify production context:

- `MAIL_DELIVERY_ENABLED=true`
- `RESEND_API_KEY`
- `CONTEXT=production`, supplied by Netlify

`MAIL_FROM` defaults to `Bald Bearded Builder <hello@baldbeardedbuilder.com>`.
`MAIL_REPLY_TO` defaults to `hello@baldbeardedbuilder.com`.

Deploy previews and local development cannot send real notification email even if an API
key is accidentally available. When delivery is disabled, `drain()` returns before claiming
rows, so queued events remain available for a later production run.

## Queue

`supabase/migrations/20260806000000_notifications.sql` creates `email_outbox`, the enqueue
triggers, `claim_email_batch`, and `unsubscribe_by_token`.

The queue stores a profile id, event payload and dedupe key. It never stores the email
address. The drain reads the current address from Supabase Auth immediately before sending,
so deleting an account also removes its queue rows and its destination.

Claims use `FOR UPDATE SKIP LOCKED`, a claim token and a ten-minute lease. This prevents
overlapping drains from selecting the same row. Resend receives the queue dedupe key as an
idempotency key, which covers a worker dying after Resend accepts a message but before
`sent_at` is written.

Failures retry five times with widening backoff. Resend rate-limit delays are honored when
they exceed the normal backoff. Unsent messages expire after 48 hours. Provider response
bodies and recipient addresses are never written to the queue or logs.

## Schedule

`netlify/functions/drain-notifications.mts` runs every five minutes on published deploys.
It calls `POST /api/notifications/` with `NOTIFY_SECRET` as a bearer token. Netlify scheduled
functions do not run on deploy previews or branch deploys.

The request also carries an `Origin` matching the site and a JSON content type. Astro's
`checkOrigin` guard is on by default and refuses an on demand POST with no matching origin
with a 403 and `Cross-site POST form submissions are forbidden`, before the route runs.
That is not the route's own refusal, which is a 404. Do not fix a 403 here by disabling the
guard: it protects the form POSTs on the rest of the site.

The scheduled run fails when a current send fails or an exhausted queue row exists. The
error names queue row ids only, plus the first 200 characters of a non-OK response body so
the refusing layer is named. Use the stored sanitized `last_error` and the Resend
dashboard to diagnose delivery.

## Unsubscribe

Every message has two paths to the same per-type setting:

- The visible link opens `/unsubscribe/` and asks for confirmation before changing anything.
- RFC 8058 clients POST `List-Unsubscribe=One-Click` and are processed immediately.

The confirmation protects against mail security scanners that prefetch ordinary links.
Neither path requires a session. A valid-looking unknown token and a real token produce the
same response, so the route does not reveal which tokens exist.

## Production rollout

1. Deploy with `MAIL_DELIVERY_ENABLED` unset or false.
2. Apply the migration and regenerate `database.types.ts`.
3. Set production-scoped `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, and `NOTIFY_SECRET`.
4. Confirm the scheduled endpoint reports delivery disabled.
5. Set `MAIL_DELIVERY_ENABLED=true`, which creates a new production deploy.
6. Insert one synthetic queue event for the owner profile and confirm it is sent once.
7. Remove the synthetic row after recording the result.

Do not enable delivery before the migration is applied. Do not apply the migration without
deploying the account controls, unsubscribe route, and updated privacy and submission copy.
