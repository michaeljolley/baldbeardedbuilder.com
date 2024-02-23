import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Analytic } from "netlify/edge-functions/types/analytic";

const supabase = createClient(
  Netlify.env.get('SUPABASE_URL') as string,
  Netlify.env.get('SUPABASE_ANON_KEY') as string,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function insertAnalytic(analytic: Analytic) {
	const { error } = await supabase.from("analytics").insert(analytic);

	if (error) {
		console.error(error);
	}
}

export async function getShortUrl(slug: string) {
  const { data, error } = await supabase
    .from('shorturls')
    .select()
    .eq('slug', slug);

  if (data && data[0] && data[0].target) {
    return data[0].target;
  }

  if (error) {
    console.error(error);
  }

  return undefined;
}
