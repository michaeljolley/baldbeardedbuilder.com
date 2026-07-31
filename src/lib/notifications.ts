/*
  DELIBERATELY NOT WIRED FOR V1. Nothing calls drain(). This site sends no email of any
  kind, and the migration that creates the table this file reads is held out of the
  applied chain in supabase/deferred/. Read docs/notifications.md before changing that:
  turning the schema on without the copy changes leaves the site promising email it does
  not send.

  Draining the email queue.

  The queue is filled by triggers in supabase/deferred/20260801000100_notifications.sql
  and emptied here. What the emails say lives in notify-templates.ts, which is pure and
  tested. This file is the part that talks to the database and to the mail provider, and
  it is careful in three specific ways, all of them the same worry from different angles:
  an email is the one thing on this site that cannot be taken back.

  The address is read here, from auth.users, and never stored in the queue. A row that
  outlives the account it belongs to therefore cannot be sent, because the lookup returns
  nothing.

  Preferences are read here too, a second time. The trigger checked them at enqueue and
  somebody can change their mind while a row waits, and the later answer is the right one.

  A failed send is written back with its error and retried with a widening gap, and a row
  that has failed enough times stops being tried. A queue that retries forever is a queue
  that mails somebody forty times the day the provider recovers.
*/

import type { SupabaseClient } from '@supabase/supabase-js';
import { allDisasters } from './disasters';
import { itemsByKeys } from './content';
import { sendMail, type Mail } from './mail';
import {
  absolute,
  isDue,
  renderNotification,
  MAX_ATTEMPTS,
  type NotificationKind
} from './notify-templates';
import { serviceClient, supabaseWritable } from './supabase';
import type { PendingDatabase } from './supabase/pending.types';

/** How many rows one drain handles. Small, because the drain runs often. */
export const BATCH = 25;

interface OutboxRow {
  id: number;
  kind: NotificationKind;
  profile_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  last_attempt_at: string | null;
}

/**
 * Where a reply lives, worked out with the same helpers the pages use.
 *
 * This is the reason the drain is an endpoint on the site rather than a database
 * function. Rebuilding topic first URLs in SQL would guarantee that the email and the
 * page eventually disagree about where something is.
 */
async function urlForComment(kind: string, key: string): Promise<string | null> {
  if (kind === 'disaster') {
    const found = allDisasters().find((d) => String(d.id) === key);
    return found ? absolute(`${found.url}#comments`) : null;
  }

  /*
    No page, no link. A video with no video_pages row has no comment thread to point at,
    so there is nothing to say here. renderNotification treats null as "this event no
    longer resolves" and settles the row rather than retrying it forever.
  */
  const [item] = await itemsByKeys([key]);
  return item?.url ? absolute(`${item.url}#comments`) : null;
}

export interface DrainResult {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Send what is waiting.
 *
 * Two drains running at once can duplicate a send in the window between reading a row and
 * marking it, which is why the schedule is one call at a time rather than one per
 * instance. The queue's unique dedupe key stops the same event being queued twice, but it
 * cannot stop the same row being read twice.
 */
export async function drain(now = new Date()): Promise<DrainResult> {
  const result: DrainResult = { considered: 0, sent: 0, skipped: 0, failed: 0 };
  if (!supabaseWritable) return result;

  /* See supabase/pending.types.ts. The cast goes when the types can be generated. */
  const db = serviceClient() as unknown as SupabaseClient<PendingDatabase>;
  const auth = serviceClient();

  const settle = (id: number, why: string) =>
    db.from('email_outbox').update({ sent_at: now.toISOString(), last_error: why }).eq('id', id);

  const { data: rows } = await db
    .from('email_outbox')
    .select('id, kind, profile_id, payload, attempts, last_attempt_at')
    .is('sent_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  if (!rows?.length) return result;

  for (const raw of rows) {
    const row = raw as unknown as OutboxRow;
    result.considered++;

    if (!isDue(row.attempts, row.last_attempt_at, now)) {
      result.skipped++;
      continue;
    }

    const { data: prefs } = await db
      .from('notification_prefs')
      .select('story_published, story_featured, comment_reply, unsubscribe_token')
      .eq('profile_id', row.profile_id)
      .maybeSingle();

    const wants = prefs
      ? row.kind === 'story_published'
        ? prefs.story_published
        : row.kind === 'story_featured'
          ? prefs.story_featured
          : prefs.comment_reply
      : false;

    /*
      Opted out, or the profile is gone. Either way this is settled rather than failed, so
      it is marked sent and never looked at again. Leaving it pending would mean somebody
      who unsubscribed keeps a row that something later decides to retry.
    */
    if (!prefs || !wants) {
      await settle(row.id, 'skipped: opted out or no profile');
      result.skipped++;
      continue;
    }

    const { data: user } = await auth.auth.admin.getUserById(row.profile_id);
    const to = user?.user?.email;

    if (!to) {
      await settle(row.id, 'skipped: no address');
      result.skipped++;
      continue;
    }

    const commentUrl =
      row.kind === 'comment_reply'
        ? await urlForComment(
            String(row.payload.target_kind ?? ''),
            String(row.payload.target_key ?? '')
          )
        : null;

    const built = renderNotification(row.kind, row.payload, prefs.unsubscribe_token, commentUrl);

    if (!built) {
      await settle(row.id, 'skipped: event no longer resolves');
      result.skipped++;
      continue;
    }

    const mail: Mail = {
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      unsubscribeUrl: built.unsubscribeUrl
    };

    const sent = await sendMail(mail);

    if (sent.ok) {
      await db.from('email_outbox').update({ sent_at: now.toISOString() }).eq('id', row.id);
      result.sent++;
    } else {
      await db
        .from('email_outbox')
        .update({
          attempts: row.attempts + 1,
          last_error: sent.error ?? 'unknown',
          last_attempt_at: now.toISOString()
        })
        .eq('id', row.id);
      result.failed++;
    }
  }

  return result;
}
