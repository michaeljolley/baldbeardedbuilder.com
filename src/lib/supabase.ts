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

export const registerSub = async (user: any) => {
	const { data, error } = await supabaseDb
		.from("registrations")
		.insert(user);
	if (error) {
		throw error;
	}
	return data;
}

export const getSub = async (userId: string) => {
	const { data, error } = await supabaseDb
		.from("registrations")
		.select("*")
		.filter("userId", "eq", userId)
		.maybeSingle();
	if (error) {
		throw error;
	}
	return data;
}
