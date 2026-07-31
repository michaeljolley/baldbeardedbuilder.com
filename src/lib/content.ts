/*
  The bridge between the content submodule and the topic first URLs.

  Content lives in michaeljolley/content and is read only from here. taxonomy.json says
  which topic owns each item and what its slug is. Nothing else in the site should read
  taxonomy.json directly, so that the day the nightly bot starts writing topics into
  frontmatter there is exactly one place to change.
*/

import { getCollection, type CollectionEntry } from 'astro:content';
import taxonomy from '../config/taxonomy.json';
import { topicBySlug, type Topic } from '../config/site';
import { isPublished } from './publish';

export type ItemKind = 'article' | 'video';

export interface Item {
  /** collection:id, the key used by taxonomy.json and START_HERE. */
  key: string;
  kind: ItemKind;
  slug: string;
  url: string;
  topic: string;
  alsoFiled: string[];
  title: string;
  description: string;
  date: Date;
  /** Reading time for an article, running time for a video. Already formatted. */
  length: string;
  /** Views for a video, null for an article until likes land in phase five. */
  views: number | null;
  thumbnail: string | null;
  /** YouTube watch URL. Only set on videos. */
  external: string | null;
  /**
   * Dated in the future. The nightly bot stages posts ahead of time. They build, so the
   * URL is live and shareable the moment the date passes and nothing 404s in between,
   * but they stay out of every listing until then.
   */
  draft: boolean;
}

interface TaxonomyEntry {
  primaryTopic: string;
  alsoFiled: string[];
  slug: string;
  url: string;
  title: string;
}

const entries = taxonomy.entries as unknown as Record<string, TaxonomyEntry>;

/**
 * Roughly 220 words a minute, which is the number most reading time estimates settle on.
 * Deliberately not exact. A reader wants to know if this is a coffee or a commute.
 */
function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 220))} min`;
}

/** 00:52 stays 00:52. 01:05:30 becomes 1:05:30. */
function runtime(duration: string): string {
  return duration.replace(/^0(?=\d:)/, '').replace(/^00:(?=\d)/, '0:');
}

let cache: Item[] | null = null;

export async function allItems(): Promise<Item[]> {
  if (cache) return cache;

  const [blog, videos] = await Promise.all([getCollection('blog'), getCollection('videos')]);
  const now = new Date();
  const items: Item[] = [];

  for (const post of blog as CollectionEntry<'blog'>[]) {
    const key = `blog:${post.id}`;
    const t = entries[key];
    if (!t) continue;
    items.push({
      key,
      kind: 'article',
      slug: t.slug,
      url: t.url,
      topic: t.primaryTopic,
      alsoFiled: t.alsoFiled ?? [],
      title: post.data.title,
      description: post.data.summary || post.data.description,
      date: post.data.pubDate,
      length: readingTime(post.body ?? ''),
      views: null,
      thumbnail: post.data.image ?? null,
      external: null,
      draft: !isPublished(post.data.pubDate, now)
    });
  }

  for (const video of videos as CollectionEntry<'videos'>[]) {
    const key = `videos:${video.data.id}`;
    const t = entries[key];
    if (!t) continue;
    items.push({
      key,
      kind: 'video',
      slug: t.slug,
      url: t.url,
      topic: t.primaryTopic,
      alsoFiled: t.alsoFiled ?? [],
      title: video.data.title,
      // Videos carry no description in the collection. The transcript work in phase
      // seven is what eventually fills this.
      description: '',
      date: video.data.date,
      length: runtime(video.data.duration),
      views: video.data.views ?? null,
      thumbnail: video.data.thumbnail,
      external: video.data.link,
      draft: !isPublished(video.data.date, now)
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  cache = items;
  return items;
}

export async function itemsInTopic(slug: string): Promise<Item[]> {
  return (await allItems()).filter((i) => i.topic === slug && !i.draft);
}

export async function itemByUrl(url: string): Promise<Item | undefined> {
  return (await allItems()).find((i) => i.url === url);
}

export async function itemsByKeys(keys: readonly string[]): Promise<Item[]> {
  const all = await allItems();
  return keys.map((k) => {
    const found = all.find((i) => i.key === k);
    /*
      Curated lists are hand written, so a typo would otherwise show up as a grid that is
      quietly one card short rather than as an error anybody notices.
    */
    if (!found) throw new Error(`No content item with key "${k}". Check src/config/site.ts.`);
    return found;
  });
}

export interface TopicView {
  topic: Topic;
  items: Item[];
  articles: number;
  videos: number;
}

export async function topicView(slug: string): Promise<TopicView | null> {
  const topic = topicBySlug(slug);
  if (!topic) return null;
  const items = await itemsInTopic(slug);
  return {
    topic,
    items,
    articles: items.filter((i) => i.kind === 'article').length,
    videos: items.filter((i) => i.kind === 'video').length
  };
}

/**
 * Sub paths a topic serves that are filters rather than content. A content slug can
 * never be one of these, which tests/taxonomy.test.mjs enforces.
 */
export const TOPIC_FILTERS = ['articles', 'videos'] as const;
export type TopicFilter = (typeof TOPIC_FILTERS)[number];
