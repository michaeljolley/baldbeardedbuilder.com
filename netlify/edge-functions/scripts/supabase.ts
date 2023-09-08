import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Analytic } from '../types/analytics.ts';
import type { Activity } from '../types/activity.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_ANON_KEY') as string,
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

export async function insertActivity(activity: Activity) {
  const { error } = await supabase.from('activities').upsert(activity).select();

  if (error) {
    console.error(error);
  }
}

export async function getActivity(today: string) {
  const { data, error } = await supabase

    .from('activities')

    .select()

    .eq('activity_date', today);

  if (data && data[0]) {
    return data[0];
  }

  if (error) {
    console.error(error);
  }

  return {
    activity_date: today,

    updated: '',

    stand_goal: 12,

    stand: 0,

    exercise_goal: 0,

    exercise: 30,

    energy: 500,

    energy_goal: 0,

    battery: 100,
  };
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
