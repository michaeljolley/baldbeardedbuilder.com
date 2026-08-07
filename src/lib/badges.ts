/*
  Reading one badge family for one person.

  The profile page shapes the whole shelf. This is the other question, asked from pages
  that are not the profile: what is this reader next in line for in one family, and how
  far off is it. Two rows of answer rather than the catalogue, so a comment thread can
  say something specific without doing a profile's worth of work.

  Everything degrades to null. A nudge is a nicety, and a badge lookup that fell over is
  never a reason for the page around it to fail.
*/

import { serviceClient, supabaseWritable } from './supabase';
import { nextStep, type NextStep, type ProgressRow, type ShelfRow } from './shelf';

export type { NextStep } from './shelf';

/** The family behind every comment badge, tier one on the first reply. */
export const FIRST_REPLY = 'first-reply';

export async function nextBadgeStep(
  profileId: string,
  family: string
): Promise<NextStep | null> {
  if (!supabaseWritable) return null;

  let db;
  try {
    db = serviceClient();
  } catch {
    return null;
  }

  try {
    const [progress, shelf] = await Promise.all([
      /* Same counter the grant triggers read, so the number quoted cannot drift from
         the one that will actually hand the badge over. */
      db.rpc('badge_progress', { p_profile: profileId }),
      db
        .from('badge_shelf')
        .select('badge_id, family, tier, name, description, category, tone, sort_order')
        .eq('family', family)
    ]);

    if (progress.error || shelf.error) return null;

    return nextStep(
      (shelf.data ?? []) as ShelfRow[],
      (progress.data ?? []) as ProgressRow[],
      family
    );
  } catch {
    return null;
  }
}
