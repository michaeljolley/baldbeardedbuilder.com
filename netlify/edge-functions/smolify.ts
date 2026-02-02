import type { Config } from "@netlify/edge-functions";
import { getShortUrl } from "./scripts/supabase.ts";

export default async function handler(req: Request) {
	// Search for the placeholder
	const url = new URL(req.url);
	const slug = url.searchParams.get("path");

	if (slug) {
		try {
			const target = await getShortUrl(slug);

			if (target) {
				return Response.redirect(target, 301);
			} else {
				return Response.redirect("http://baldbeardedbuilder.com/404/", 301);
			}
		} catch (e) {
			console.error(e);
		}
	}

	return Response.redirect("http://baldbeardedbuilder.com/", 301);
}

export const config: Config = {
	path: "/api/smolify",
};
