import type { APIRoute } from 'astro';
import { getShortUrl } from '@scripts/supabase';

export const GET: APIRoute = async ({ request }) => {
	
	const url = new URL(request.url);
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
