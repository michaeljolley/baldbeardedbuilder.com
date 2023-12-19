import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Analytic } from "../types/analytics.ts";
import type { Mention } from "../types/mention.ts";

const supabase = createClient(
	Deno.env.get("SUPABASE_URL") as string,
	Deno.env.get("SUPABASE_ANON_KEY") as string,
	{
		auth: {
			persistSession: false,
		},
	},
);

export async function insertAnalytic(analytic: Analytic) {
	const { error } = await supabase.from("analytics").insert(analytic);

	if (error) {
		console.error(error);
	}
}

export async function getShortUrl(slug: string) {
	const { data, error } = await supabase
		.from("shorturls")
		.select()
		.eq("slug", slug);

	if (data && data[0] && data[0].target) {
		return data[0].target;
	}

	if (error) {
		console.error(error);
	}

	return undefined;
}

export async function insertMention(mention: Mention) {
	const { error } = await supabase.from("mentions").insert(mention);

	if (error) {
		console.error(error);
	}
}
