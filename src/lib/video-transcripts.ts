/*
  Video transcripts.

  Caption providers produce short cues, while a reader needs topics and paragraphs. This
  module keeps chapter boundaries, joins cues into complete sentences, and groups those
  sentences into readable blocks. Hand-authored segments can add a speaker field without a
  schema change because segments is JSON.
*/

import { serviceClient, supabaseWritable } from './supabase';
import type { Database } from './supabase/database.types';
import curatedTopics from '../config/video-transcript-topics.json';

const DEFAULT_SPEAKER = 'Michael Jolley';
const MAX_SENTENCES_PER_PARAGRAPH = 5;
const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const topicOverrides: Record<string, unknown> = curatedTopics;

export interface TranscriptBlock {
  start: number | null;
  speaker: string;
  speakerChanged: boolean;
  text: string;
}

export interface TranscriptChapter {
  start: number | null;
  title: string | null;
  blocks: TranscriptBlock[];
}

export interface VideoTranscript {
  chapters: TranscriptChapter[];
  paragraphCount: number;
  soloSpeaker: string | null;
  topicCount: number;
}

interface CaptionCue {
  start: number;
  speaker: string;
  text: string;
}

interface ChapterMarker {
  start: number;
  title: string;
}

interface Sentence {
  start: number | null;
  speaker: string;
  text: string;
}

interface Paragraph {
  chapterIndex: number;
  start: number | null;
  speaker: string;
  text: string;
}

type TranscriptRow = Pick<
  Database['public']['Tables']['video_transcripts']['Row'],
  'video_id' | 'body' | 'chapters' | 'segments'
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
  const speaker = typeof item.speaker === 'string' && item.speaker.trim()
    ? item.speaker.trim()
    : DEFAULT_SPEAKER;

  return { start, speaker, text };
}

function chapterMarkers(value: unknown): ChapterMarker[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((value) => {
      const item = record(value);
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      if (!item || !title) return [];
      return [{ start: seconds(item.start ?? item.t, 0), title }];
    })
    .sort((left, right) => left.start - right.start);
}

function chapterAt(markers: ChapterMarker[], start: number): number {
  let found = -1;
  for (let index = 0; index < markers.length; index += 1) {
    if (markers[index].start > start) break;
    found = index;
  }
  return found;
}

function sentencesForCues(cues: CaptionCue[]): Sentence[] {
  let text = '';
  const offsets: { index: number; start: number }[] = [];

  for (const item of cues) {
    if (text) text += ' ';
    offsets.push({ index: text.length, start: item.start });
    text += item.text;
  }

  const sentences: Sentence[] = [];
  for (const part of sentenceSegmenter.segment(text)) {
    const leadingSpace = part.segment.length - part.segment.trimStart().length;
    const index = part.index + leadingSpace;
    const value = part.segment.trim();
    if (!value) continue;

    let start = offsets[0]?.start ?? null;
    for (const offset of offsets) {
      if (offset.index > index) break;
      start = offset.start;
    }
    sentences.push({ start, speaker: cues[0].speaker, text: value });
  }
  return sentences;
}

function cueSentences(
  value: unknown,
  markers: ChapterMarker[]
): (Sentence & { chapterIndex: number })[] {
  if (!Array.isArray(value)) return [];

  const cues = value
    .map(cue)
    .filter((item): item is CaptionCue => item !== null)
    .sort((left, right) => left.start - right.start);
  const turns: CaptionCue[][] = [];

  for (const item of cues) {
    const current = turns.at(-1);
    const previous = current?.at(-1);
    const belongsWithCurrent = current && previous
      && previous.speaker === item.speaker;

    if (belongsWithCurrent) {
      current.push(item);
    } else {
      turns.push([item]);
    }
  }

  return turns.flatMap((turn) => (
    sentencesForCues(turn).map((sentence) => ({
      ...sentence,
      chapterIndex: chapterAt(markers, sentence.start ?? 0)
    }))
  ));
}

function paragraphs(sentences: (Sentence & { chapterIndex: number })[]): Paragraph[] {
  const built: Paragraph[] = [];

  for (let index = 0; index < sentences.length;) {
    let groupEnd = index + 1;
    while (
      groupEnd < sentences.length
      && sentences[groupEnd].chapterIndex === sentences[index].chapterIndex
      && sentences[groupEnd].speaker === sentences[index].speaker
    ) {
      groupEnd += 1;
    }

    const group = sentences.slice(index, groupEnd);
    for (let cursor = 0; cursor < group.length;) {
      const remaining = group.length - cursor;
      let size = Math.min(MAX_SENTENCES_PER_PARAGRAPH, remaining);
      // Six sentences balance as four plus two instead of leaving a one-sentence orphan.
      if (remaining - size === 1 && size > 2) size -= 1;

      const paragraphSentences = group.slice(cursor, cursor + size);
      built.push({
        chapterIndex: paragraphSentences[0].chapterIndex,
        start: paragraphSentences[0].start,
        speaker: paragraphSentences[0].speaker,
        text: paragraphSentences.map((sentence) => sentence.text).join(' ')
      });
      cursor += size;
    }

    index = groupEnd;
  }

  return built;
}

function bodyParagraphs(body: string): Paragraph[] {
  const sentences = Array.from(sentenceSegmenter.segment(body), (part) => ({
    chapterIndex: -1,
    start: null,
    speaker: DEFAULT_SPEAKER,
    text: part.segment.trim()
  })).filter((sentence) => sentence.text);
  return paragraphs(sentences);
}

function transcript(row: TranscriptRow): VideoTranscript | null {
  const storedMarkers = chapterMarkers(row.chapters);
  const markers = storedMarkers.length
    ? storedMarkers
    : chapterMarkers(topicOverrides[row.video_id]);
  const timedSentences = cueSentences(row.segments, markers);
  const builtParagraphs = timedSentences.length
    ? paragraphs(timedSentences)
    : row.body?.trim()
      ? bodyParagraphs(row.body.trim())
      : [];
  if (!builtParagraphs.length) return null;

  const speakers = [...new Set(builtParagraphs.map((paragraph) => paragraph.speaker))];
  let previousSpeaker: string | null = null;
  const chapterIndexes = [...new Set(builtParagraphs.map((paragraph) => paragraph.chapterIndex))];
  const chapters = chapterIndexes.map((chapterIndex) => {
    const marker = markers[chapterIndex];
    const blocks = builtParagraphs
      .filter((paragraph) => paragraph.chapterIndex === chapterIndex)
      .map((paragraph) => {
        const speakerChanged = paragraph.speaker !== previousSpeaker;
        previousSpeaker = paragraph.speaker;
        return {
          start: paragraph.start,
          speaker: paragraph.speaker,
          speakerChanged,
          text: paragraph.text
        };
      });

    return {
      start: marker?.start ?? blocks[0]?.start ?? null,
      title: marker?.title ?? null,
      blocks
    };
  });

  return {
    chapters,
    paragraphCount: builtParagraphs.length,
    soloSpeaker: speakers.length === 1 ? speakers[0] : null,
    topicCount: chapters.filter((chapter) => chapter.title).length
  };
}

/** Every available transcript, keyed by YouTube id. */
export async function videoTranscripts(): Promise<Map<string, VideoTranscript>> {
  if (cache) return cache;

  const built = new Map<string, VideoTranscript>();
  if (supabaseWritable) {
    const { data, error } = await serviceClient()
      .from('video_transcripts')
      .select('video_id, body, chapters, segments');

    if (error) throw new Error(`Could not load video transcripts: ${error.message}`);

    for (const row of data as TranscriptRow[]) {
      const value = transcript(row);
      if (value) built.set(row.video_id, value);
    }
  }

  cache = built;
  return built;
}
