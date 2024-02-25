import type { Config, Context } from "https://edge.netlify.com/";
import { type Cookie } from "https://deno.land/std@0.148.0/http/cookie.ts";
import { insertAnalytic } from "./scripts/supabase.ts";

const astroed = `<section class="astroed">
<div class="wrapper">
	<aside>
		<span>Astro<br />FTW!</span>
		<img src="/images/astro.svg" alt="Astro logo" />
	</aside>
	<div>
		<p>
			Heyo friendo! Looks like you got here from <a
				href="https://astro.build?ref=baldbeardedbuilder">astro.build</a
			>. In that case, I've got some Astro goodness you might enjoy.
		</p>
		<p>
			First up, the code for this site is open-sourced on
			<a href="https://github.com/michaeljolley/baldbeardedbuilder.com"
				>GitHub</a
			>. Take a look at the repository and feel free to shoot me any questions
			on <a href="https://twitter.com/michaeljolley">Twitter</a>.
		</p>
		<p>
			Next, I've got a few blog posts about Astro that you might find
			interesting. You can check out all the <a href="/blog/tags/astro"
				>'astro' tagged posts here</a
			>.
		</p>
	</div>
</div>
</section>`;

export default async (request: Request, context: Context) => {
	const response = await context.next();
	const page = await response.text();

	const sessionId = getSessionId(context);

	const analytic = await insertAnalytic({
		session: sessionId,
		referrer: request.headers.get("referer") || undefined,
		latitude: context.geo.latitude,
		longitude: context.geo.longitude,
		country_code: context.geo.country.code,
	});

	let updatedPage = page;

	if (analytic.referrer === "https://astro.build/") {
		const astroRegex = /<!-- ASTROED -->/i;
		updatedPage = page.replace(astroRegex, astroed);
	}

	const regex = /<!-- ANALYTIC -->/i;
	updatedPage = page.replace(regex, analytic.id);
	return new Response(updatedPage, response);
};

function getSessionId(context: Context): string {
	const cookie: Cookie | undefined = context.cookies.get("bwm");
	if (!cookie) {
		const sessionId = uuidv4();

		context.cookies.set({
			name: "bwm",
			value: sessionId,
			expires: exp(),
		});

		return sessionId;
	}
	return cookie;
}

function uuidv4(): string {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (<any>[1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
		/[018]/g,
		(c: number) =>
			(
				c ^
				(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
			).toString(16),
	);
}

function exp() {
	return new Date(new Date().getTime() + 300000);
}

export const config: Config = {
	path: "/*",
	excludedPath: [
		"/api/*",
		"/*.css",
		"/*.js",
		"/*.svg",
		"/*.png",
		"/*.txt",
		"/*.mjs",
		"/*.tsx",
		"/*.ts",
		"/*.scss",
		"/@vite/*",
		"/site.webmanifest",
		"/*.astro",
		"/fonts/*",
		"/images/*",
		"/node_modules/*",
		"/@id/*",
	],
};
