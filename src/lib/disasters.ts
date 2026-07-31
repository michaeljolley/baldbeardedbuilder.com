/*
  Dev disasters.

  Approved submissions live in Supabase and reach the site through the build hook in
  decision 23, so at build time this is a read of published rows. That read lands in
  phase four. Until then the same shape is served from a seed file, which keeps the
  pages honest rather than stubbed and means the swap is one function body.

  A disaster never belongs to a topic. Severity and its id are the whole taxonomy.
*/

import seed from '../config/disasters.seed.json';
import { SEVERITIES, type SeverityId } from '../config/site';

export interface Disaster {
  /** Sequential, shown as the diagnostic code. Stable, never reused. */
  id: number;
  slug: string;
  url: string;
  severity: SeverityId;
  /** AI written on submit, editable in Studio. Reads as a label, not a headline. */
  title: string;
  /** The line people remember. This is the headline on the wall and in the panel. */
  line: string;
  /** GitHub handle, or null when told anonymously. */
  teller: string | null;
  likes: number;
  replies: number;
  date: Date;
  /** Story paragraphs. Plain prose, no markup. */
  body: string[];
}

interface SeedRow {
  id: number;
  slug: string;
  severity: string;
  title: string;
  line: string;
  teller: string | null;
  likes: number;
  replies: number;
  published: string;
  body: string[];
}

const SEVERITY_IDS = SEVERITIES.map((s) => s.id) as readonly string[];

let cache: Disaster[] | null = null;

export function allDisasters(): Disaster[] {
  if (cache) return cache;

  const rows = (seed.disasters as SeedRow[]).map((r) => {
    if (!SEVERITY_IDS.includes(r.severity)) {
      throw new Error(`Disaster ${r.id} has severity "${r.severity}", which is not one of ${SEVERITY_IDS.join(', ')}`);
    }
    return {
      id: r.id,
      slug: r.slug,
      url: `/dev-disasters/${r.slug}/`,
      severity: r.severity as SeverityId,
      title: r.title,
      line: r.line,
      teller: r.teller,
      likes: r.likes,
      replies: r.replies,
      date: new Date(r.published),
      body: r.body
    } satisfies Disaster;
  });

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  cache = rows;
  return rows;
}

export type DisasterSort = 'liked' | 'replies' | 'newest';

export function sortDisasters(rows: Disaster[], sort: DisasterSort): Disaster[] {
  const out = [...rows];
  if (sort === 'liked') out.sort((a, b) => b.likes - a.likes);
  else if (sort === 'replies') out.sort((a, b) => b.replies - a.replies);
  else out.sort((a, b) => b.date.getTime() - a.date.getTime());
  return out;
}

export function countsBySeverity(): Record<SeverityId | 'all', number> {
  const rows = allDisasters();
  const out = { all: rows.length } as Record<SeverityId | 'all', number>;
  for (const s of SEVERITIES) out[s.id] = rows.filter((r) => r.severity === s.id).length;
  return out;
}

/** The three word summary the panel bar shows on the front page. */
export function problemSummary(): string {
  const c = countsBySeverity();
  const other = c.all - c.error - c.warning;
  return `${c.error} errors, ${c.warning} warnings, ${other} other`;
}

export function disasterBySlug(slug: string): Disaster | undefined {
  return allDisasters().find((d) => d.slug === slug);
}

/** Three digits is what the mockup draws, and what a diagnostic code looks like. */
export function disasterCode(id: number): string {
  return String(id).padStart(3, '0');
}
