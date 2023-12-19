import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
	import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
	SUPABASE_URL as string,
	SUPABASE_ANON_KEY as string,
	{
		auth: {
			persistSession: false,
		},
	},
);

export async function getAnalytics() {
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

export async function getMentions(target: string) {
	try {
		const response = await supabase
			.from("mentions")
			.select("*")
			.eq("target", target)
			.order("published", { ascending: false });

		if (response.data) {
			return response.data;
		}
	} catch (error) {
		console.error(error);
	}
	return [];
}
