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
		posts.push(`<entry>
		<id>https://baldbeardedbuilder.com/blog/${post.slug}/</id>
		<title><![CDATA[${post.data.title}]]></title>
		<link href="https://baldbeardedbuilder.com/blog/${post.slug}/"/>
		<updated>${post.data.pubDate.toISOString()}</updated>
		${post.data.tags.map((tag) => `		<category term="${tag}"/>`).join("\n")}
		<summary><![CDATA[${post.data.description}]]></summary>
	</entry>`);
	}
	const xmlPosts = posts.join("\n");

	let dumps = [];
	for (const post of brainDumps) {
		const { Content } = await post.render();
		dumps.push(`<entry>
		<id>https://baldbeardedbuilder.com/brain-dump/${post.slug}/</id>
		<title><![CDATA[${post.data.title}]]></title>
		<link href="https://baldbeardedbuilder.com/brain-dump/${post.slug}/"/>
		<updated>${post.data.pubDate.toISOString()}</updated>
${post.data.tags.map((tag) => `		<category term="${tag}"/>`).join("\n")}
		<summary><![CDATA[${post.data.description}</summary>
	</entry>`);
	}

	const xmlBrainDumps = dumps.join("\n");

	const rss = `<?xml version="1.0" encoding="utf-8"?>
	<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
		
		<atom:link href="https://baldbeardedbuilder.com/rss.xml" rel="self" type="application/rss+xml" />

	<title>Michael Jolley is the Bald Bearded Builder</title>
	<link href="https://baldbeardedbuilder.com/"/>
	<updated>${new Date().toISOString()}</updated>
	<category term="dotnet"/>
	<category term="javascript"/>
	<category term="csharp"/>
	<category term="typescript"/>
	<category term="programming"/>
	<id>https://baldbeardedbuilder.com/</id>
	<author>
		<name>Michael Jolley</name>
		<email>mike@baldbeardedbuilder.com</email>
		<uri>https://baldbeardedbuilder.com/</uri>
	</author>
	${xmlPosts}
	${xmlBrainDumps}
</rss>`;

	return new Response(rss, {
		status: 200,
		headers: {
			"Content-Type": "application/atom+xml",
		},
	});
}
