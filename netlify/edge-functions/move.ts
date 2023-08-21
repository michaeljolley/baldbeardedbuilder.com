import type { Config, Context } from 'https://edge.netlify.com/'
import type { Activity } from './types/activity.ts'
import { getActivity } from './scripts/supabase.ts'

export default async function handler(req: Request, context: Context) {
  const moveRegex = /--MOVE-RING--/i
  const standRegex = /--STAND-RING--/i
  const exerciseRegex = /--EXERCISE-RING--/i
  const moveAmountRegex = /--MOVE-AMOUNT--/i
  const standAmountRegex = /--STAND-AMOUNT--/i
  const exerciseAmountRegex = /--EXERCISE-AMOUNT--/i
  const localTimeRegex = /--LOCAL-TIME--/i

  const response = await context.next()
  const page = await response.text()

  const todayUTC = new Date()
  const todayDate = new Date(todayUTC.setHours(todayUTC.getHours() - 5))
  const today = todayDate.toISOString().split('T')[0]

  const activity: Activity = await getActivity(today)

  // Replace the content
  let updatedPage = page.replace(
    moveRegex,
    (activity.energy / activity.energy_goal) * 100
  )
  updatedPage = updatedPage.replace(
    exerciseRegex,
    (activity.exercise / activity.exercise_goal) * 100
  )
  updatedPage = updatedPage.replace(
    standRegex,
    (activity.stand / activity.stand_goal) * 100
  )
  updatedPage = updatedPage.replace(moveAmountRegex, activity.energy)
  updatedPage = updatedPage.replace(exerciseAmountRegex, activity.exercise)
  updatedPage = updatedPage.replace(standAmountRegex, activity.stand)
  updatedPage = updatedPage.replace(
    localTimeRegex,
    todayDate.toISOString().split('T')[1].slice(0, 5)
  )

  return new Response(updatedPage, response)
}

export const config: Config = {
  path: '/*',
  excludedPath: [
    '/api/*',
    '/*.css',
    '/*.js',
    '/*.svg',
    '/*.png',
    '/*.txt',
    '/*.tsx',
    '/*.mjs',
    '/*.ts',
    '/*.scss',
    '/@vite/*',
    '/site.webmanifest',
    '/*.astro',
    '/fonts/*',
  ],
}
