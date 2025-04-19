export const prerender = false;
import type { APIRoute } from "astro";

const notionClientId = import.meta.env.NOTION_CLIENT_ID;
const notionAuthUrl = "https://api.notion.com/v1/oauth/authorize";

export const GET: APIRoute = async ({ request, redirect }) => {
	return redirect(`${notionAuthUrl}?client_id=${notionClientId}&response_type=code&owner=user&redirect_uri=https://baldbeardedbuilder.com/api/notion/token/`)
};
