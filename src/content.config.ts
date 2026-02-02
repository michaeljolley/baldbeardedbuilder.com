import { defineCollection, reference, z } from "astro:content";
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    image: z.string().url().optional(),
    image_alt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string(),
    canonicalUrl: z.string().url().optional(),
    featured: z.number().optional(),
		snapshot: z.string().optional(),
  }),
});

const brainDumpCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/brainDumps' }),
  schema: z.object({
    pubDate: z.date(),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

const clipsCollection = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/clips' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    link: z.string().url(),
    embed: z.string().url(),
    date: z.date(),
    thumbnail: z.string().url(),
  }),
});

const dripsCollection = defineCollection({
  loader: glob({ pattern: "**/index.md", base: "./src/content/drips" }),
  schema: z.object({
    publishDate: z.string(),
    links: z.array(
            z.object({
              title: z.string(),
              url: z.string().url(),
              summary: z.string() 
          }))
  })
});

const eventsCollection = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/events' }),
  schema: z.object({
    pubDate: z.date(),
    name: z.string(),
    location: z.string(),
    recording: z.string().url().optional(),
  }),
});

const gearCollection = defineCollection({
  loader: glob({ pattern: '*.yml', base: './src/content/gear' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string(),
    status: z.enum(["active", "retired", "wishlist"]),
    rank: z.number(),
    tags: z.array(z.string()).optional(),
    link: z.string().url().optional(),
  }),
});

const talksCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/talks' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().url().optional(),
    image_alt: z.string().optional(),
    summary: z.string(),
    featured: z.number().optional(),
    events: z.array(reference("events")),
  }),
});

const videosCollection = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/videos' }),
  schema: z.object({
    id: z.string(),
    date: z.date(),
    title: z.string(),
    link: z.string().url(),
    thumbnail: z.string().url(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  brainDumps: brainDumpCollection,
  clips: clipsCollection,
  drips: dripsCollection,
  events: eventsCollection,
  gear: gearCollection,
  talks: talksCollection,
  videos: videosCollection
};
