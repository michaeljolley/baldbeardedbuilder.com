import type { APIRoute } from 'astro';
import type { Analytic } from "../types/analytics.ts";
import { createSupabase } from "../scripts/supabase.ts";

export const POST: APIRoute = async ({ request }) => {
	const env = {
		SUPABASE_URL: import.meta.env.SUPABASE_URL,
		SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
	};

	const analytic: Analytic = await request.json();

	if (!analytic) {
		return new Response(JSON.stringify({}), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	const supabase = createSupabase(env);
	const { error } = await supabase.from("analytics").insert(analytic);

	if (error) {
		console.error(error);
	}

	return new Response(JSON.stringify({}), {
		status: 200,

		headers: {
			"Content-Type": "application/json",
		},
	});

}
