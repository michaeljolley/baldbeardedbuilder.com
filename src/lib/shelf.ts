/*
  Shaping a badge shelf.

  Split out of profiles.ts because this is the part with rules in it and profiles.ts is
  the part with a database in it. Nothing here imports Supabase, which means plain node can
  run it and the tests do not need a project, a key or a network.

  The rules, in one place so they can be argued with:

  1. A numeral only appears on a family with more than one step. "Confessor I" on a badge
     with no second tier reads as a bug.
  2. Progress only appears on the lowest unearned tier in a family. Showing "62 of 1000"
     under a badge two steps away is discouragement dressed as information.
  3. Progress never appears on a badge with a threshold of one, because "0 of 1" tells
     somebody nothing they did not already work out from the badge being dark.
  4. Earned badges sort first. The shelf is a record of what somebody did, not a to do list.
*/

import type { SeverityId } from '../config/site';

export interface ShelfBadge {
  id: string;
  family: string | null;
  tier: number | null;
  name: string;
  description: string;
  category: 'presence' | 'craft' | 'care';
  tone: SeverityId;
  earned: boolean;
  /** Roman numeral for tiered families, null for a badge that has only one step. */
  numeral: string | null;
  /** How far along the next unearned badge in a family is. Null everywhere else. */
  progress: { n: number; threshold: number } | null;
}

/* The shape badge_shelf returns. Every column nullable, because it is a view. */
export interface ShelfRow {
  badge_id: string | null;
  family: string | null;
  tier: number | null;
  name: string | null;
  description: string | null;
  category: string | null;
  tone: string | null;
  sort_order: number | null;
}

/* The shape badge_progress returns. */
export interface ProgressRow {
  badge_id: string;
  event: string;
  n: number;
  threshold: number;
  earned: boolean;
}

const NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function numeral(tier: number | null, familySize: number): string | null {
  if (!tier || familySize < 2) return null;
  return NUMERALS[tier] ?? String(tier);
}

export function shapeShelf(shelf: ShelfRow[], progress: ProgressRow[]): ShelfBadge[] {
  const byBadge = new Map(progress.map((r) => [r.badge_id, r]));
  const earned = new Set(progress.filter((r) => r.earned).map((r) => r.badge_id));

  const familySizes = new Map<string, number>();
  for (const row of shelf) {
    if (!row.family) continue;
    familySizes.set(row.family, (familySizes.get(row.family) ?? 0) + 1);
  }

  /*
    The next step in each family. Sorted by tier so the lowest unearned one wins, with
    untiered badges treated as a family of one so they still qualify.
  */
  const next = new Set<string>();
  const seen = new Set<string>();
  for (const row of [...shelf].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))) {
    if (!row.badge_id) continue;
    const key = row.family ?? row.badge_id;
    if (seen.has(key) || earned.has(row.badge_id)) continue;
    seen.add(key);
    next.add(row.badge_id);
  }

  /*
    Every column on a view comes back nullable, because Postgres will not promise a view
    preserves not-null. The rows are all real, so this filter is a type narrowing rather
    than a data check, but it is the honest way to say so.
  */
  return shelf
    .filter((row) => row.badge_id && row.name && row.description)
    .map((row) => {
      const id = row.badge_id!;
      const p = byBadge.get(id);
      const show = Boolean(p && !p.earned && next.has(id) && p.threshold > 1);

      return {
        id,
        family: row.family,
        tier: row.tier,
        name: row.name!,
        description: row.description!,
        category: (row.category ?? 'presence') as ShelfBadge['category'],
        tone: (row.tone ?? 'info') as SeverityId,
        earned: earned.has(id),
        numeral: numeral(row.tier, familySizes.get(row.family ?? '') ?? 1),
        progress: show ? { n: Number(p!.n), threshold: p!.threshold } : null
      };
    })
    .sort((a, b) => Number(b.earned) - Number(a.earned));
}
