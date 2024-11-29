// With `output: 'hybrid'` configured:
export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'twitch',
		options: {
			redirectTo: "http://localhost:4321/api/auth/callback/"
		},
	});

	if (error) {
		return new Response(error.message, { status: 500 });
	}
	
	return redirect(data.url);
};
