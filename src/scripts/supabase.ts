import { createClient } from "@supabase/supabase-js";
import type { Env } from "../types/env.ts";


export async function getAnalytics() {
	const env = {
		SUPABASE_URL: import.meta.env.SUPABASE_URL,
		SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
	};
	const supabase = createSupabase(env);
	try {
		const response = await supabase
			.from("analytics_path_visits")
			.select("*")
			.eq("host", import.meta.env.HOST)
			.neq("path", "/blog/")
			.like("path", "/blog/%")
			.order("visits", { ascending: false });

		if (response.data) {
			return response.data;
		}
	} catch (error) {
		console.error(error);
	}
	return [];
}

export function createSupabase(env: Env) {
	return createClient(
		env.SUPABASE_URL,
		env.SUPABASE_ANON_KEY,
		{
			auth: {
				persistSession: false,
			},
		},
	);
}
