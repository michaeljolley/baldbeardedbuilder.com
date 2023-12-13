import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
	let posts = await getCollection(
		"blog",
		({ data }) => data.pubDate <= new Date(),
	);
	posts = posts.sort((a, b) => b.data.pubDate - a.data.pubDate);

	return rss({
		title: "Michael Jolley is the Bald Bearded Builder",
		description: "Blog posts from Michael Jolley, the Bald Bearded Builder.",
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/blog/${post.slug}/`,
		})),
	});
}
