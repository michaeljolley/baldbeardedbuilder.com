import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Analytic } from '../types/analytics.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  SUPABASE_URL as string,
  SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function insertAnalytic(analytic: Analytic) {
  const { error } = await supabase.from('analytics').insert(analytic);

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
