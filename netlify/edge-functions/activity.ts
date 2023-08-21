import type { Config } from 'https://edge.netlify.com/'
import type { Activity } from './types/activity.ts'
import { insertActivity } from './scripts/supabase.ts'

export default async function handler(req: Request) {
  const activity: Activity = await req.json()

  if (!validateHeader(req) || !activity) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  const result = await insertActivity(activity)

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const config: Config = {
  path: '/api/activity',
}

function validateHeader(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return false
  }

  if (authHeader === Deno.env.get('WEBHOOK_SECRET')) {
    return true
  }

  return false
}
