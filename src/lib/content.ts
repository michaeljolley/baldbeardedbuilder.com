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
import { videoPages } from './video-pages';

export type ItemKind = 'article' | 'video';

export interface Item {
  /** collection:id, the key used by taxonomy.json and START_HERE. */
  key: string;
  kind: ItemKind;
  slug: string;
  /**
   * The page on this site, or null when there is not one.
   *
   * Null only ever happens for a video, and only when no video_pages row exists for it.
   * Deliberately nullable rather than defaulting to the URL a page would have had, so
   * that anything printing a link to a page has to say out loud what it does when there
   * is no page. Use href to link to an item and url to talk about a page.
   */
  url: string | null;
  /** Where a card sends somebody. The page when there is one, YouTube when there is not. */
  href: string;
  /** True when href points off this site. */
  offsite: boolean;
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
  /** A YouTube short. Only meaningful on videos. */
  short: boolean;
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

  const [blog, videos, pages] = await Promise.all([
    getCollection('blog'),
    getCollection('videos'),
    videoPages()
  ]);
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
      href: t.url,
      offsite: false,
      topic: t.primaryTopic,
      alsoFiled: t.alsoFiled ?? [],
      title: post.data.title,
      description: post.data.summary || post.data.description,
      date: post.data.pubDate,
      length: readingTime(post.body ?? ''),
      views: null,
      thumbnail: post.data.image ?? null,
      external: null,
      short: false,
      draft: !isPublished(post.data.pubDate, now)
    });
  }

  for (const video of videos as CollectionEntry<'videos'>[]) {
    const key = `videos:${video.data.id}`;
    const t = entries[key];
    if (!t) continue;
    /*
      No row, no page. The card then points at YouTube, which is where the video has been
      the whole time, rather than at a page that would only exist to say so.
    */
    const page = pages.get(video.data.id);
    const live = page ? isPublished(page.publishedAt, now) : false;
    items.push({
      key,
      kind: 'video',
      slug: t.slug,
      url: live ? t.url : null,
      href: live ? t.url : video.data.link,
      offsite: !live,
      topic: t.primaryTopic,
      alsoFiled: t.alsoFiled ?? [],
      title: video.data.title,
      /*
        Videos carry no description in the collection, and nothing generates one. A row in
        video_pages is the only source, so until Michael writes one a video row in a feed
        is a title, a kind and a runtime. That is the shape to design for, not the
        exception to handle.
      */
      description: page?.summary ?? '',
      date: video.data.date,
      length: runtime(video.data.duration),
      views: video.data.views ?? null,
      thumbnail: video.data.thumbnail,
      external: video.data.link,
      short: video.data.short,
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
  return (await allItems()).find((i) => i.url !== null && i.url === url);
}

/** Everything with a page on this site. What getStaticPaths and the sitemap want. */
export async function pagedItems(): Promise<Item[]> {
  return (await allItems()).filter((i) => i.url !== null);
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
