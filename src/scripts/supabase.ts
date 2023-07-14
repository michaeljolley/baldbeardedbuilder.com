import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.SUPABASE_URL as string,
  import.meta.env.SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: false,
    },
  }
)

export async function getAnalytics() {
  try {
    const response = await supabase
      .from('analytics_path_visits')
      .select('*')
      .eq('host', import.meta.env.HOST)
      .neq('path', '/blog/')
      .like('path', '/blog/%')
      .order('visits', { ascending: false })

    if (response.data) {
      return response.data
    }
  } catch (error) {
    console.error(error)
  }
  return []
}
