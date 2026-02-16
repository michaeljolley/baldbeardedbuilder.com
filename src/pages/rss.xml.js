import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPostPublished } from '../scripts/publish';

export async function GET(context) {
  const posts = await getCollection('blog');
  
  const publishedPosts = posts
    .filter(post => isPostPublished(post.data.pubDate))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'Bald Bearded Builder',
    description: 'Bringing smiles to the syntax - because laughter is the best error handler.',
    site: context.site,
    items: publishedPosts.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
