import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const videosDir = path.join(root, 'src', 'content', 'videos');
const outputDir = path.join(root, 'backfill', 'video-transcripts');
const rowsDir = path.join(outputDir, 'rows');
const csvPath = path.join(outputDir, 'video_transcripts.csv');
const failuresPath = path.join(outputDir, 'failures.json');
const refresh = process.argv.includes('--refresh');
const onlyIndex = process.argv.indexOf('--only');
const onlyArgument = process.argv.find((argument) => argument.startsWith('--only='));
const only = onlyArgument?.slice('--only='.length) || (onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null);

const columns = [
  'video_id',
  'source',
  'language',
  'segments',
  'body',
  'chapters',
  'duration',
  'transcript_updated_at',
  'chapters_updated_at'
];

function catalogue() {
  return fs.readdirSync(videosDir)
    .filter((name) => name.endsWith('.yml'))
    .map((name) => YAML.parse(fs.readFileSync(path.join(videosDir, name), 'utf8')))
    .filter((video) => video?.id && video.short !== true)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function durationSeconds(value) {
  const parts = String(value ?? '').split(':').map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function captionTrack(info) {
  for (const [generated, tracks] of [
    [false, info.subtitles ?? {}],
    [true, info.automatic_captions ?? {}]
  ]) {
    const languages = Object.keys(tracks)
      .filter((language) => language === 'en' || language.startsWith('en-'))
      .sort((left, right) => Number(left !== 'en') - Number(right !== 'en'));

    for (const language of languages) {
      const options = tracks[language] ?? [];
      const track = options.find((item) => item.ext === 'json3' && item.url);
      if (track) return { generated, language, url: track.url };
    }
  }
  return null;
}

function decodeText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function transcriptSegments(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return events.flatMap((event) => {
    const text = decodeText(
      (event.segs ?? []).map((segment) => segment?.utf8 ?? '').join('')
    );
    if (!text) return [];

    const start = Number(event.tStartMs ?? 0) / 1000;
    const duration = Number(event.dDurationMs ?? 0) / 1000;
    return [{ start, end: start + duration, text }];
  });
}

function descriptionChapters(description, duration) {
  const chapters = [];
  for (const line of String(description ?? '').split('\n')) {
    const match = line.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)$/);
    if (!match) continue;
    const start = Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    const title = match[4].replace(/^[\s\-–—:|]+/, '').trim();
    if (title) chapters.push({ start, title });
  }
  return chapters.length >= 2 && chapters[0].start < duration ? chapters : [];
}

function chapters(info, duration) {
  const supplied = Array.isArray(info.chapters) ? info.chapters : [];
  const normalized = supplied
    .map((chapter) => ({ start: Number(chapter.start_time ?? 0), title: String(chapter.title ?? '').trim() }))
    .filter((chapter) => chapter.title);
  return normalized.length ? normalized : descriptionChapters(info.description, duration);
}

async function videoInfo(id) {
  const args = [
    '-J',
    '--skip-download',
    '--no-warnings',
    '--js-runtimes',
    'node',
    '--remote-components',
    'ejs:github'
  ];
  const browser = process.env.YOUTUBE_TRANSCRIPT_COOKIES_FROM_BROWSER?.trim();
  if (browser) args.push('--cookies-from-browser', browser);
  args.push(`https://www.youtube.com/watch?v=${id}`);

  const { stdout } = await exec('yt-dlp', args, { maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function captionPayload(url, headers) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === 3) {
      throw new Error(`caption download returned HTTP ${response.status}`);
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : 2000 * 2 ** attempt);
  }
  throw new Error('caption download failed');
}

async function buildRow(video) {
  const info = await videoInfo(video.id);
  const track = captionTrack(info);
  if (!track) throw new Error('no English JSON3 caption track');

  const segments = transcriptSegments(await captionPayload(track.url, info.http_headers));
  if (!segments.length) throw new Error('caption track contained no transcript segments');

  const duration = Math.round(Number(info.duration) || durationSeconds(video.duration) || 0) || null;
  const updatedAt = new Date().toISOString();
  return {
    video_id: video.id,
    source: 'youtube',
    language: track.language,
    segments,
    body: segments.map((segment) => segment.text).join(' '),
    chapters: chapters(info, duration),
    duration,
    transcript_updated_at: updatedAt,
    chapters_updated_at: updatedAt
  };
}

function csvCell(value) {
  const text = value == null
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(rows) {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(','));
  fs.writeFileSync(csvPath, `${lines.join('\r\n')}\r\n`);
}

async function main() {
  const allVideos = catalogue();
  const videos = allVideos.filter((video) => !only || video.id === only);
  if (only && !videos.length) throw new Error(`long-form video not found: ${only}`);

  fs.mkdirSync(rowsDir, { recursive: true });
  console.log(`video-transcripts: ${videos.length} long-form videos`);

  const attemptedFailures = new Map();
  for (const [index, video] of videos.entries()) {
    const rowPath = path.join(rowsDir, `${video.id}.json`);
    if (!refresh && fs.existsSync(rowPath)) {
      console.log(`video-transcripts: ${index + 1}/${videos.length} ${video.id} cached`);
      continue;
    }

    try {
      const row = await buildRow(video);
      fs.writeFileSync(rowPath, `${JSON.stringify(row, null, 2)}\n`);
      console.log(`video-transcripts: ${index + 1}/${videos.length} ${video.id} fetched`);
      await wait(1000);
    } catch (error) {
      attemptedFailures.set(video.id, error.message);
      console.error(`video-transcripts: ${index + 1}/${videos.length} ${video.id} failed: ${error.message}`);
    }
  }

  const missing = [];
  const rows = allVideos.flatMap((video) => {
    const rowPath = path.join(rowsDir, `${video.id}.json`);
    if (fs.existsSync(rowPath)) return [JSON.parse(fs.readFileSync(rowPath, 'utf8'))];
    missing.push({
      video_id: video.id,
      error: attemptedFailures.get(video.id) ?? 'no cached row; rerun to fetch this transcript'
    });
    return [];
  });
  writeCsv(rows);

  if (missing.length) {
    fs.writeFileSync(failuresPath, `${JSON.stringify(missing, null, 2)}\n`);
    if (!only || attemptedFailures.size) process.exitCode = 1;
  } else if (fs.existsSync(failuresPath)) {
    fs.rmSync(failuresPath);
  }

  console.log(`video-transcripts: wrote ${rows.length} rows to ${path.relative(root, csvPath)}`);
  if (missing.length) console.error(`video-transcripts: ${missing.length} videos need attention`);
}

main().catch((error) => {
  console.error(`video-transcripts: ${error.message}`);
  process.exitCode = 1;
});
