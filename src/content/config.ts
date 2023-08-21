import { defineCollection, reference, z } from 'astro:content'

const gearCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string(),
    status: z.enum(['active', 'retired', 'wishlist']),
    rank: z.number(),
    tags: z.array(z.string()).optional(),
    link: z.string().url().optional(),
  }),
})

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    pubDate: z.date(),
    title: z.string(),
    image: z.string().url().optional(),
    image_alt: z.string().optional(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    summary: z.string(),
    canonicalUrl: z.string().url().optional(),
    featured: z.number().optional(),
    ograph: z.string().url().optional(),
  }),
})

const talksCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().url().optional(),
    image_alt: z.string().optional(),
    summary: z.string(),
    featured: z.number().optional(),
    events: z.array(reference('events')),
  }),
})

const eventsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    pubDate: z.date(),
    name: z.string(),
    location: z.string(),
    recording: z.string().url().optional(),
  }),
})

export const collections = {
  blog: blogCollection,
  gear: gearCollection,
  talks: talksCollection,
  events: eventsCollection,
}
