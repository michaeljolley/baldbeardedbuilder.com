import { getCollection } from "astro:content";

export async function GET() {
	const posts = await getCollection(
		"blog",
		({ data }) => data.pubDate <= new Date(),
	);
	const brainDumps = await getCollection(
		"brainDumps",
		({ data }) => data.pubDate <= new Date(),
	);

	const xmlPosts = posts
		.map((post) => {
			return `<url>
		<loc>https://baldbeardedbuilder.com/blog/${post.slug}/</loc>
		<priority>0.8</priority>
	</url>`;
		})
		.join("\n");

	const xmlBrainDumps = brainDumps
		.map(
			(post) => `<url>
	<loc>https://baldbeardedbuilder.com/brain-dump/${post.slug}/</loc>
	<priority>0.8</priority>
</url>`,
		)
		.join("\n");

	const sitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
	<url>
		<loc>https://baldbeardedbuilder.com/</loc>
		<changefreq>daily</changefreq>
	</url>
	<url>
		<loc>https://baldbeardedbuilder.com/blog/</loc>
		<changefreq>weekly</changefreq>
	</url>
	<url>
		<loc>https://baldbeardedbuilder.com/brain-dump/</loc>
		<changefreq>weekly</changefreq>
	</url>
	<url>
		<loc>https://baldbeardedbuilder.com/uses/</loc>
		<changefreq>monthly</changefreq>
	</url>
	<url>
		<loc>https://baldbeardedbuilder.com/code-of-conduct/</loc>
	</url>
	${xmlPosts}
	${xmlBrainDumps}
</urlset>`;

	return new Response(sitemap, {
		status: 200,
		headers: {
			"Content-Type": "application/xml",
		},
	});
}
