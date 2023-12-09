import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const posts = await getCollection('blog', ({ data }) => data.pubDate <= new Date());
	return rss({
		title: "Michael Jolley is the Bald Bearded Builder",
		description: "Blog posts from Michael Jolley, the Bald Bearded Builder.",
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.slug}/`,
		})),
	});
}
