import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getSupabaseClient() {
	return createClient(
		Netlify.env.get("SUPABASE_URL") as string,
		Netlify.env.get("SUPABASE_ANON_KEY") as string,
		{
			auth: {
				persistSession: false,
			},
		},
	);
}

export async function getShortUrl(slug: string) {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from("shorturls")
		.select()
		.eq("slug", slug);

		
	console.error(data);

	if (data && data[0] && data[0].target) {
		return data[0].target;
	}

	if (error) {
		console.error(error);
	}

	return undefined;
}
