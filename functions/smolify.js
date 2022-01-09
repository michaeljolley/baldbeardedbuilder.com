const Lokka = require('lokka').Lokka
const Transport = require('lokka-transport-http').Transport

const faunaSecret = process.env.FAUNADBSECRET

const headers = {
  Authorization: `Bearer ${faunaSecret}`,
}
const transport = new Transport('https://graphql.fauna.com/graphql', {
  headers,
})

const client = new Lokka({
  transport,
})

exports.handler = async (event, context) => {
  let redirectUrl = 'https://baldbeardedbuilder.com/'
  const path = event.queryStringParameters.path

  const realdeal = await getLongUrl(path)

  if (realdeal && realdeal.url) {
    redirectUrl = realdeal.url
  }

  return {
    statusCode: 302,
    headers: {
      location: redirectUrl,
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({}),
  }
}

const getLongUrl = async (path) => {
  let longUrl

  // Lookup path in FaunaDb & get the longUrl if it exists
  try {
    const variables = {
      source: path,
    }

    const data = await client.query(query, variables)

    if (data.shortyMcShortLinkBySource && data.shortyMcShortLinkBySource) {
      const shortLink = data.shortyMcShortLinkBySource

      await recordVisit(shortLink)

      longUrl = shortLink.target
    }
  } catch (err) {
    console.log(err)
  }

  return {
    url: longUrl,
  }
}

const recordVisit = async (shortLink) => {
  // Save the updated visit count to Fauna
  try {
    const variables = {
      id: shortLink._id,
      data: {
        source: shortLink.source,
        target: shortLink.target,
        visits: ++shortLink.visits,
      },
    }

    await client.mutate(mutation, variables)
  } catch (err) {
    console.log(err)
  }
}

const query = `
  query getEm($source: String!) {
    shortyMcShortLinkBySource(source:$source){
      _id
      source
      target
      visits
    }
  }
`

const mutation = `
  ($id:ID!, $data: ShortyMcShortLinkInput!) {
    updateShortyMcShortLink(
          id: $id,
          data: $data) {
      _id
      source
      target
      visits
    }
  }
`
