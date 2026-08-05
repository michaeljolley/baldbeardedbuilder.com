/*
  Chapters for the long form videos.

  The one piece of conflict 4 that turned out to cost nothing. YouTube hands chapters back
  through the same InnerTube call that serves a watch page, as DESCRIPTION_CHAPTERS with
  millisecond starts and titles already written by the person who uploaded the video. No
  key, no account, no quota.

  Transcripts are a separate problem, because the public caption endpoint now answers with an
  empty body unless the request carries a proof of origin token. The route that works is the
  YouTube Data API authenticated as the channel owner. See docs/backfill.md.

  Shorts are skipped. A chapter list on a fifty second video is furniture.

  Safe to run repeatedly. Rows are upserted and a video whose chapters have not changed is
  written back identically, which costs one statement and saves having to reason about
  what "changed" means for a list somebody may have reordered on YouTube.
*/

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Innertube } from 'youtubei.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const curatedTopics = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'config', 'video-transcript-topics.json'), 'utf8')
);

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/*
  Dry runs exist because the interesting half of this script needs nothing from Supabase.
  Whether YouTube still hands chapters over is the question that actually matters, and it
  can be answered without a key and without writing anything.
*/
const DRY = process.argv.includes('--dry');

/*
  YouTube.js logs a wall of parser warnings whenever YouTube ships a renderer it has not
  seen yet, which is roughly weekly and never affects the two fields wanted here. Silenced
  so a real failure is visible in the output rather than buried in it.
*/
const noise = console.warn;
console.warn = () => {};

function videos() {
  const dir = path.join(root, 'src', 'content', 'videos');
  const out = [];

  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      if (!entry.name.endsWith('.yml')) continue;

      const raw = fs.readFileSync(p, 'utf8');
      if (/^short:\s*true/m.test(raw)) continue;

      const id = raw.match(/^id:\s*['"]?([\w-]+)/m)?.[1];
      if (id) out.push(id);
    }
  };

  walk(dir);
  return [...new Set(out)];
}

async function rest(pathname, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  if (!res.ok) throw new Error(`supabase ${pathname}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function chaptersFrom(info) {
  const markers = info.player_overlays?.decorated_player_bar?.player_bar?.markers_map ?? [];

  for (const marker of markers) {
    const list = marker.value?.chapters ?? [];
    if (!list.length) continue;

    return list
      .map((c) => ({
        start: Math.round(Number(c.time_range_start_millis ?? 0) / 1000),
        title: String(c.title?.text ?? '').trim()
      }))
      .filter((c) => c.title);
  }

  return [];
}

async function main() {
  if (!DRY && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.log('video-meta: skipped, missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const ids = videos();
  console.log(`video-meta: ${ids.length} long form videos`);

  const yt = await Innertube.create({ lang: 'en', location: 'US', retrieve_player: false });

  let withChapters = 0;
  let without = 0;
  let failed = 0;

  for (const [i, id] of ids.entries()) {
    try {
      const info = await yt.getInfo(id);
      const youtubeChapters = chaptersFrom(info);
      const chapters = youtubeChapters.length ? youtubeChapters : curatedTopics[id] ?? [];
      const duration = Number(info.basic_info?.duration ?? 0) || null;

      if (chapters.length) withChapters += 1;
      else without += 1;

      if (DRY) {
        console.log(`video-meta: ${id} ${chapters.length} chapters, ${duration ?? '?'}s`);
      } else {
        /*
          An empty YouTube result is not evidence that a manually curated outline should be
          deleted. Only send the chapter fields when YouTube supplied chapters, so authored
          transcript topics survive later metadata refreshes.
        */
        const chapterFields = chapters.length
          ? { chapters, chapters_updated_at: new Date().toISOString() }
          : {};
        await rest('video_transcripts?on_conflict=video_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            video_id: id,
            duration,
            ...chapterFields
          })
        });
      }
    } catch (error) {
      failed += 1;
      console.log(`video-meta: ${id} failed, ${error.message}`);
    }

    if ((i + 1) % 10 === 0) console.log(`video-meta: ${i + 1} of ${ids.length}`);

    /*
      A short pause between videos. Nothing here is rate limited in any documented way,
      which is exactly why it is worth not finding out.
    */
    await new Promise((r) => setTimeout(r, 250));
  }

  console.warn = noise;
  console.log(
    `video-meta: ${withChapters} with chapters, ${without} without, ${failed} failed`
  );
}

main().catch((error) => {
  console.warn = noise;
  console.error(`video-meta: ${error.message}`);
  process.exitCode = 1;
});
