import type { Config, Context } from 'https://edge.netlify.com/'
import * as queryString from 'https://deno.land/x/querystring@v1.0.2/mod.js'

export default async (request: Request, context: Context) => {
  const response = await context.next()
  const page = await response.text()

  let updatedPage = page

  try {
    // Search for the placeholder
    const regex = /<!-- TWITCH_STATUS -->/i

    // Replace the content
    let twitchEmbed = ''

    const isLive = await isLiveOnTwitch()

    if (isLive) {
      twitchEmbed = `<section class="liveOnTwitch">
        <div class="wrapper">
          <span>Hey!</span>
          <p>
            I'm live on <a href="https://twitch.tv/baldbeardedbuilder" target="_blank">Twitch</a> right now. Come join in!
          </p>
        </div>
    </section>`
    }

    updatedPage = page.replace(regex, twitchEmbed)
  } catch (error) {
    console.error(error)
  }
  return new Response(updatedPage, response)
}

const isLiveOnTwitch = async (): Promise<boolean> => {
  const opts = {
    client_id: Deno.env.get('TWITCH_CLIENT_ID'),
    client_secret: Deno.env.get('TWITCH_CLIENT_SECRET'),
    grant_type: 'client_credentials',
    scopes: '',
  }
  const params = queryString.stringify(opts)

  const authResponse = await fetch(
    `https://id.twitch.tv/oauth2/token?${params}`,
    {
      method: 'POST',
    }
  )
  const authBody = await authResponse.text()
  const authData = JSON.parse(authBody)

  const response = await fetch(
    `https://api.twitch.tv/helix/streams?user_login=baldbeardedbuilder`,
    {
      headers: {
        'Client-ID': Deno.env.get('TWITCH_CLIENT_ID') as string,
        Authorization: `Bearer ${authData.access_token}`,
      },
    }
  )
  const body = await response.text()

  const { data: streams } = JSON.parse(body)

  return streams && streams.length > 0
}

export const config: Config = {
  path: '/blah/*',
  excludedPath: [
    '/api/*',
    '/*.css',
    '/*.js',
    '/*.svg',
    '/*.png',
    '/*.txt',
    '/*.mjs',
    '/*.tsx',
    '/*.ts',
    '/*.scss',
    '/@vite/*',
    '/site.webmanifest',
    '/*.astro',
    '/fonts/*',
  ],
}
