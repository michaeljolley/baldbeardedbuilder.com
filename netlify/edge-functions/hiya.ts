import type { Config, Context } from "https://edge.netlify.com/";
import { type Cookie } from "https://deno.land/std@0.148.0/http/cookie.ts";
import { insertAnalytic } from "./scripts/supabase.ts";

export default async (request: Request, context: Context) => {
	const response = await context.next();
	const page = await response.text();

	const sessionId = getSessionId(context);

	const analytic = await insertAnalytic({
		session: sessionId,
		referrer: request.referrer,
		latitude: context.geo.latitude,
		longitude: context.geo.longitude,
		country_code: context.geo.country.code,
	});

	const regex = /<!-- ANALYTIC -->/i;
	let updatedPage = page.replace(regex, analytic.id);
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
