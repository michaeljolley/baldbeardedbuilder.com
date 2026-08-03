/*
  Video transcripts.

  Caption providers produce short cues, while a reader needs paragraphs. This module groups
  adjacent cues from the same speaker into readable blocks and keeps the first cue's start
  time for the YouTube deep link. Hand-authored segments can add a speaker field without a
  schema change because segments is JSON.
*/

import { serviceClient, supabaseWritable } from './supabase';
import type { Database } from './supabase/database.types';

const DEFAULT_SPEAKER = 'Michael Jolley';
const MAX_BLOCK_LENGTH = 480;
const MAX_CUE_GAP_SECONDS = 8;

export interface TranscriptBlock {
  start: number;
  speaker: string;
  text: string;
}

export interface VideoTranscript {
  blocks: TranscriptBlock[];
}

interface CaptionCue extends TranscriptBlock {
  end: number;
}

type TranscriptRow = Pick<
  Database['public']['Tables']['video_transcripts']['Row'],
  'video_id' | 'body' | 'segments'
>;

let cache: Map<string, VideoTranscript> | null = null;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function seconds(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cue(value: unknown): CaptionCue | null {
  const item = record(value);
  if (!item || typeof item.text !== 'string') return null;

  const text = item.text.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const start = seconds(item.start ?? item.t, 0);
  const end = Math.max(start, seconds(item.end, start));
  const speaker = typeof item.speaker === 'string' && item.speaker.trim()
    ? item.speaker.trim()
    : DEFAULT_SPEAKER;

  return { start, end, speaker, text };
}

function groupedBlocks(value: unknown): TranscriptBlock[] {
  if (!Array.isArray(value)) return [];

  const cues = value.map(cue).filter((item): item is CaptionCue => item !== null);
  const groups: CaptionCue[] = [];

  for (const item of cues) {
    const current = groups.at(-1);
    const combinedLength = current ? current.text.length + item.text.length + 1 : 0;
    const gap = current ? item.start - current.end : Number.POSITIVE_INFINITY;
    const belongsWithCurrent = current
      && current.speaker === item.speaker
      && gap <= MAX_CUE_GAP_SECONDS
      && combinedLength <= MAX_BLOCK_LENGTH;

    if (belongsWithCurrent) {
      current.text = `${current.text} ${item.text}`;
      current.end = Math.max(current.end, item.end);
    } else {
      groups.push({ ...item });
    }
  }

  return groups.map(({ start, speaker, text }) => ({ start, speaker, text }));
}

function transcript(row: TranscriptRow): VideoTranscript | null {
  const blocks = groupedBlocks(row.segments);
  if (blocks.length) return { blocks };

  const body = row.body?.trim();
  return body
    ? { blocks: [{ start: 0, speaker: DEFAULT_SPEAKER, text: body }] }
    : null;
}

/** Every available transcript, keyed by YouTube id. */
export async function videoTranscripts(): Promise<Map<string, VideoTranscript>> {
  if (cache) return cache;

  const built = new Map<string, VideoTranscript>();
  if (supabaseWritable) {
    const { data, error } = await serviceClient()
      .from('video_transcripts')
      .select('video_id, body, segments');

    if (error) throw new Error(`Could not load video transcripts: ${error.message}`);

    for (const row of data as TranscriptRow[]) {
      const value = transcript(row);
      if (value) built.set(row.video_id, value);
    }
  }

  cache = built;
  return built;
}
