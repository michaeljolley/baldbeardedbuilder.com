import type { Config, Context } from 'https://edge.netlify.com/'

export default async (request: Request, context: Context) => {
  const fullRegex = /--BRAINDUMP_STATUS--/i
  const shortRegex = /--BRAINDUMP_STATUS_SMALL--/i

  const fullForm = `<form action="/api/braindump" accept-charset="UTF-8" method="POST">
  <input type="hidden" name="loc" value="braindump"/>
  <p>
    Let's learn together with the Brain Dump newsletter, a curated download
    of the latest news, gadgets, productivity hacks, and more.
  </p>
  <p class="hint">
    You can unsubscribe at any time and I will never sell your information
    to others.
  </p>
  <p>
    <label for="first_name">First Name</label><br />
    <input type="text" name="first_name" placeholder="Dwight" required />
  </p><p>
    <label for="email">Email</label><br />
    <input type="email" name="email" placeholder="dshrutt@dundermifflin.com" required />
  </p><p>
    <button type="submit" title="Subscribe to the Brain Dump newsletter">
      Subscribe
    </button>
  </p>
  </form>`

  const shortForm = `<p>
  Let's learn together with the Brain Dump newsletter, a curated download of
  the latest news, gadgets, productivity hacks, and more.
  </p>
  <p class="hint">
  You can unsubscribe at any time and I will never sell your information to
  others.
  </p>
  <div>
  <form action="/api/braindump" accept-charset="UTF-8" method="POST">
    <input type="hidden" name="loc" value="braindumpshort"/>
    <p>
      <label for="first_name">First Name</label><br />
      <input type="text" name="first_name" placeholder="Dwight" required />
    </p><p>
      <label for="email">Email</label><br />
      <input
        type="email"
        name="email"
        placeholder="dshrutt@dundermifflin.com"
        required
      />
    </p><p>
      <button type="submit" title="Subscribe to the Brain Dump newsletter">
        Subscribe
      </button>
    </p>
  </form>
  <img
    alt="AI generated image of a neon human brain with digital lights dripping off it."
    src="https://res.cloudinary.com/dk3rdh3yo/image/upload/dpr_auto,f_auto/v1687805654/website-assets/brain.png"
    sizes="100vw"
    height="355"
    width="532"
    loading="lazy" />
  </div>`

  const longAck = `<div class="form">
  <p>
    You're in! Check your email to confirm your subscription. If you don't see
    it, check your spam folder. And welcome aboard!
  </p>
  </div>`

  const shortAck = `<div class="form">
  <p>
    You're in! Check your email to confirm your subscription. If you don't see
    it, check your spam folder. And welcome aboard!
  </p>
  <img
    alt="AI generated image of a neon human brain with digital lights dripping off it."
    src="https://res.cloudinary.com/dk3rdh3yo/image/upload/dpr_auto,f_auto/v1687805654/website-assets/brain.png"
    sizes="100vw"
    height="355"
    width="532"  
    loading="lazy"
    />   
  </div>`

  const response = await context.next()
  const page = await response.text()

  let longBrainDump = fullForm
  let shortBrainDump = shortForm

  try {
    // Search for the placeholder
    const url = new URL(request.url)
    const subQuery = url.searchParams.get('subscribed')

    const subscribed = subQuery === 'true'
    if (subscribed) {
      longBrainDump = longAck
      shortBrainDump = shortAck
    }
  } catch (error) {
    console.error(error)
  }

  // Replace the content
  let updatedPage = page.replace(fullRegex, longBrainDump)
  updatedPage = updatedPage.replace(shortRegex, shortBrainDump)

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
