import rss from "@astrojs/rss";
import { getCollection, type CollectionEntry } from "astro:content";

export async function GET(context: any) {
	let posts = await getCollection(
		"blog",
		({ data }) => data.pubDate <= new Date(),
	);
	posts = posts.sort(
		(a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) =>
			b.data.pubDate.getTime() - a.data.pubDate.getTime(),
	);

	return rss({
		title: "Michael Jolley is the Bald Bearded Builder",
		description: "Blog posts from Michael Jolley, the Bald Bearded Builder.",
		site: context.site,
		items: posts.map((post: CollectionEntry<"blog">) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/blog/${post.slug}/`,
		})),
	});
}
