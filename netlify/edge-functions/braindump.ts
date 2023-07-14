import type { Config } from 'https://edge.netlify.com/'

export default async (request: Request) => {
  const subscriber = await request.formData()

  const response = await fetch(
    'https://api.convertkit.com/v3/forms/5311675/subscribe',
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      method: 'POST',
      body: JSON.stringify({
        email: subscriber.get('email'),
        first_name: subscriber.get('first_name'),
        api_key: Deno.env.get('CONVERTKIT_API_KEY'),
      }),
    }
  )

  let url = request.headers.get('origin')

  if (!response.ok) {
    console.error('Error sending to ConvertKit', response)
  } else {
    url = `${url}?subscribed=true#${subscriber.get('loc')}`
  }

  return Response.redirect(new URL(url))
}

export const config: Config = {
  path: '/api/braindump',
}
