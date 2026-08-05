/*
  Video pages.

  Named video-pages and not videos on purpose. This module reads the video_pages table and
  nothing else. It has never touched the videos collection, which is the actual catalogue
  and is read in content.ts. Under the old name somebody looking for the catalogue opened
  this file, found the page gate, and had to go looking again.

  A video gets a detail page if and only if there is a video_pages row for it. Decision 22
  and amendment 47 are the rule, this is the only place the rule is read, and there is no
  second path that can produce a page some other way.

  On day one there are no rows, so there are no video detail pages. That is the correct
  outcome rather than a gap to paper over: a page whose whole content is an apology and a
  link to YouTube is worse than the link on its own. The catalogue still lists every video
  and every one of them still goes somewhere, it just goes to YouTube until Michael has
  something to add. Pages appear one at a time as rows land, and nothing else has to
  change for that to happen.

  Read once per build. Empty map when Supabase is not configured, which is also what a
  fork or a preview build with no keys gets.
*/

import { serviceClient, supabaseWritable } from './supabase';
import type { Database } from './supabase/database.types';

export interface VideoPage {
  /** False removes the video from every item-backed site surface. */
  included: boolean;
  /** Card summary in a feed and lede on the page. Null until somebody writes one. */
  summary: string | null;
  publishedAt: Date;
}

type VideoPageRow = Database['public']['Tables']['video_pages']['Row'];

let cache: Map<string, VideoPage> | null = null;

/**
 * Every published video page, keyed by YouTube id.
 *
 * Future dated rows are filtered here rather than in the query, so the rule matches the
 * one the content submodule already uses for staged posts: the page builds and its URL
 * works the moment the date passes, it just stays out of every listing until then.
 */
export async function videoPages(): Promise<Map<string, VideoPage>> {
  if (cache) return cache;

  const built = new Map<string, VideoPage>();

  if (supabaseWritable) {
    const { data } = await serviceClient()
      .from('video_pages')
      .select('video_id, included, summary, published_at');

    for (const row of (data ?? []) as VideoPageRow[]) {
      if (!row.video_id) continue;
      built.set(row.video_id, {
        included: row.included,
        summary: row.summary,
        publishedAt: new Date(row.published_at)
      });
    }
  }

  cache = built;
  return built;
}
