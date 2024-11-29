import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
    },
  },
);


const supabaseDb = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);

export const getGifters = async () => {
	const { data, error } = await supabaseDb
		.from("subgift_leaders")
		.select("*")
		.order("total_gifts", { ascending: false })
		.limit(5);
	if (error) {
		throw error;
	}
	return data;
}
