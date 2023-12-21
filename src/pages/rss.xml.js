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
		const { Content } = await post.render();
		posts.push(`<item>
		<id>https://baldbeardedbuilder.com/blog/${post.slug}/</id>
		<title><![CDATA[${post.data.title}]]></title>
		<link>https://baldbeardedbuilder.com/blog/${post.slug}/</link>
		<pubDate>${post.data.pubDate.toISOString()}</pubDate>
		${post.data.tags.map((tag) => `<category>${tag}</category>`).join("\n")}
		<description><![CDATA[${post.data.description}]]></description>
	</item>`);
	}
	const xmlPosts = posts.join("\n");

	let dumps = [];
	for (const post of brainDumps) {
		const { Content } = await post.render();
		dumps.push(`<item>
		<id>https://baldbeardedbuilder.com/brain-dump/${post.slug}/</id>
		<title><![CDATA[${post.data.title}]]></title>
		<link>https://baldbeardedbuilder.com/brain-dump/${post.slug}/</link>
		<pubDate>${post.data.pubDate.toISOString()}</pubDate>
		${post.data.tags.map((tag) => `<category>${tag}</category>`).join("\n")}
		<description><![CDATA[${post.data.description}]]></description>
	</item>`);
	}

	const xmlBrainDumps = dumps.join("\n");

	const rss = `<?xml version="2.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
		
	<title>Michael Jolley is the Bald Bearded Builder</title>
	<link href="https://baldbeardedbuilder.com/"/>
	<description>Tutorials, videos, and more related to software development.</description>
	<language>en-US</language>
	<pubDate>${new Date().toISOString()}</pubDate>
	<lastBuildDate>${new Date().toISOString()}</lastBuildDate>
	<category>dotnet</category>
	<category>javascript</category>
	<category>csharp</category>
	<category>typescript</category>
	<category>programming</category>
	<id>https://baldbeardedbuilder.com/</id>
	<author>
		<name>Michael Jolley</name>
		<email>mike@baldbeardedbuilder.com</email>
		<uri>https://baldbeardedbuilder.com/</uri>
	</author>
	${xmlPosts}
	${xmlBrainDumps}
</feed>`;

	return new Response(rss, {
		status: 200,
		headers: {
			"Content-Type": "application/xml",
		},
	});
}
