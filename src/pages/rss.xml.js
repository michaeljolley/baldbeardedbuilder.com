import { getCollection } from "astro:content";

export async function GET() {
	const blogPosts = await getCollection(
		"blog",
		({ data }) => data.pubDate <= new Date(),
	);
	const brainDumps = await getCollection(
		"brainDumps",
		({ data }) => data.pubDate <= new Date(),
	);

	const posts = [];
	for (const post of blogPosts) {
		posts.push(`<item>
		<author>mike@baldbeardedbuilder.com (Michael Jolley)</author>
		<title><![CDATA[${post.data.title}]]></title>
		<pubDate>${post.data.pubDate.toUTCString()}</pubDate>
		<guid>https://baldbeardedbuilder.com/blog/${post.slug}/</guid>
		<link>https://baldbeardedbuilder.com/blog/${post.slug}/</link>
		<description><![CDATA[${post.data.description}]]></description>
	${post.data.tags.map((tag) => `	<category>${tag}</category>`).join("\n")}		
	</item>`);
	}
	const xmlPosts = posts.join("\n");

	let dumps = [];
	for (const post of brainDumps) {
		dumps.push(`<item>
	<author>mike@baldbeardedbuilder.com (Michael Jolley)</author>
	<title><![CDATA[${post.data.title}]]></title>
	<pubDate>${post.data.pubDate.toUTCString()}</pubDate>
	<guid>https://baldbeardedbuilder.com/brain-dump/${post.slug}/</guid>
	<link>https://baldbeardedbuilder.com/brain-dump/${post.slug}/</link>
	<description><![CDATA[${post.data.description}]]></description>
${post.data.tags.map((tag) => `	<category>${tag}</category>`).join("\n")}		
</item>`);
	}

	const xmlBrainDumps = dumps.join("\n");

	const rss = `<?xml version="1.0" encoding="utf-8"?>
	<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
		<channel>
			<atom:link href="https://baldbeardedbuilder.com/rss.xml" rel="self" type="application/rss+xml" />
			<description>Articles, videos, and more from Michael Jolley, the Bald Bearded Builder.</description>
			<link>https://baldbeardedbuilder.com/</link>
			<title>Michael Jolley is the Bald Bearded Builder</title>
			<category>dotnet</category>
			<category>javascript</category>
			<category>csharp</category>
			<category>typescript</category>
			<category>programming</category>
			<language>en-us</language>
			<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
			<pubDate>${new Date().toUTCString()}</pubDate>

			${xmlPosts}
			${xmlBrainDumps}
		</channel>
	</rss>`;

	return new Response(rss, {
		status: 200,
		headers: {
			"Content-Type": "application/atom+xml",
		},
	});
}
