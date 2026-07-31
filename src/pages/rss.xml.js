/*
  The site feed.

  Articles only. Videos have their own feed on YouTube and duplicating them here would
  push the articles somebody subscribed for off the first page.

  Links come from allItems(), so they are the topic first URLs. Drafts are dated in the
  future and stay out, same rule as every other listing.
*/
import rss from '@astrojs/rss';
import { allItems } from '../lib/content';
import { SITE } from '../config/site';

export async function GET(context) {
  const items = (await allItems())
    .filter((i) => i.kind === 'article' && !i.draft)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return rss({
    title: SITE.name,
    description: SITE.tagline,
    site: context.site,
    items: items.map((i) => ({
      title: i.title,
      pubDate: i.date,
      description: i.description,
      link: i.url,
      categories: [i.topic, ...i.alsoFiled]
    }))
  });
}
