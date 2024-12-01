// With `output: 'hybrid'` configured:
export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const host = import.meta.env.HOST;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'twitch',
		options: {
			redirectTo: `http://${host}/api/auth/callback/`
		},
	});

	if (error) {
		return new Response(error.message, { status: 500 });
	}
	
	return redirect(data.url);
};
