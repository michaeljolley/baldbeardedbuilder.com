---
pubDate: 2022-07-18T00:00:00.000Z
title: Creating Short URLs with Netlify Functions and FaunaDb
description: Creating a personalized short URL service using Netlify functions and FaunaDb.
image: https://res.cloudinary.com/dk3rdh3yo/image/upload/w_526,dpr_auto,f_auto/v1688341953/blog/using-netlify-functions-faunadb-for-short-urls/neon_computer_monitor_with_neon_lightning_all_around_m6ncdf.png
image_alt: AI generated image of a computer monitor with neon lightning all around it.
tags:
  - netlify
  - faunadb
  - serverless
summary: Personalized short URLs are cool. So I decided to see if I could use a
  serverless function to do it for me.
ograph: https://res.cloudinary.com/dk3rdh3yo/image/upload/v1688750573/blog/using-netlify-functions-faunadb-for-short-urls/ograph.png
---

Personalized short URLs look so cool. Sure, I could use a service like Bitly.
They even provide the ability to use your domain. But I love building things,
even when I don't need to. It allows me to explore and learn new things.

I realized I needed a short URL when I started sharing posts from my website,
baldbeardedbuilder.com. It's a long one, and that's not considering slugs. So I
went on the hunt for something super short and found bbb.dev. It's
perfect! I purchased it quickly and got to work.

## Storing URLs

First up was keeping up with the short/long URL pairs. I knew I'd be looking for
a database, and having used [Fauna](https://fauna.com) in the past, I decided it
would work well for this application. My site doesn't get a lot of traffic, so I
expected their free tier to cover me.

> **Update:** this function has been running for well over a year and I still don't
> come close to fully utilizing Fauna's free tier.

### Data Structure

In my Fauna account, I created a new database named `smolify` with a collection
named `ShortyMcShortLink`. Why those names? Because I like to think my dad-joke
brain is clever. 😁

Next, I added an initial record. I knew it needed a short code and a full URL,
but I also thought it would be cool to track how many visits that short URL had
been used. So I added a `visits` property to keep track of that. My first short
URL would be used for the BBB community code of conduct and looked like the
following:

```js
{
  "source": "coc",
  "target": "https://baldbeardedbuilder.com/code-of-conduct/",
  "visits": 0
}
```

Whenever I need a new short URL, I log into Fauna and create a new document in
that format with the corresponding `source` and `target`.

### Retrieving Data

With data in my collection, I needed a way to grab specific records based on
the `source` property. To do that, I created an index named
`shortyMcShortLinkBySource`. Again, I apologize for my dad-joke-inspired naming
conventions. 🙄

That index has one 'term' that it watches; the `source` property.

## Creating the Netlify Function

Once the database was ready, I moved to create a serverless function to
retrieve and update data. My site is currently hosted on
[Netlify](https://netlify.com), so their functions seemed like a great place to
start.

I created a new JavaScript file named `smolify.js` and added my dependencies.

```js
import { Client, query } from 'faunadb'
require('dotenv').config()

exports.handler = async (event) => {}
```

### Finding the Short Code

First, I needed to find the short code and get the long URL. To do that, I
created the `getLongUrl` function. It takes a path (in this case, the
short-code) and finds it in the index I previously set up.

The `mapResponse` function performs a little mapping to make it easier to
identify the `id` assigned by Fauna for later use and then return the record
Fauna found. If anything goes wrong it returns undefined.

```js
const getLongUrl = async (path) => {
  try {
    const response = await client.query(
      query.Map(
        query.Paginate(
          query.Match(query.Index('shortyMcShortLinkBySource'), path)
        ),
        query.Lambda(
          'ShortyMcShortLink',
          query.Get(query.Var('ShortyMcShortLink'))
        )
      )
    )

    if (response.data && response.data.length > 0) {
      const shortUrl = mapResponse(response.data[0])
      return shortUrl
    }
  } catch (err) {
    console.log(err)
  }

  return undefined
}

function mapResponse(payload) {
  return {
    ...payload.data,
    _id: payload.ref.value.id,
  }
}
```

### Counting Visits

Before I send the result back to the browser, I want to record the visit to
Fauna. To do that, I created the `recordVisit` function below. It increments
the visit count that Fauna provided and then replaces that object based on the
Fauna `id` that we mapped.

```js
const recordVisit = async (shortUrl) => {
  try {
    shortUrl.visits++

    await client.query(
      query.Replace(
        query.Ref(query.Collection('ShortyMcShortLink'), shortUrl._id),
        {
          data: shortUrl,
        }
      )
    )
  } catch (err) {
    console.log(err)
  }
}
```

Then I updated the `getLongUrl` function to add a call to `recordVisit` between
mapping and returning it.

```js {2}
const shortUrl = mapResponse(response.data[0])
await recordVisit(shortUrl)
return shortUrl
```

### Finishing Our Function

With the JavaScript ready, I added it to the handler function. First, it calls
the `getLongUrl` function with the `event.queryStringParameters.path`.
I'll cover changing `/coc` to `/?path=coc` later.

If the function can find a short URL, the `redirectUrl` variable is set to its
`target` property. If it returns undefined, the function will redirect the
person to the homepage of baldbeardedbuilder.com.

```js
exports.handler = async (event, context) => {
  const shortUrl = await getLongUrl(event.queryStringParameters.path)
  const redirectUrl = shortUrl
    ? shortUrl.target
    : 'https://baldbeardedbuilder.com/'

  return {
    statusCode: 302,
    headers: {
      location: redirectUrl,
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({}),
  }
}
```

## Configuring Netlify

All that was left was to redirect the traffic using the short URL to the
function. Luckily, Netlify makes that a pretty quick process. First, I added the
domain to my Netlify application. Once it was set up and sending traffic to the
site, I set up the redirect on Netlify.

### Redirecting the Short URL

At the root of the site, I added a `netlify.toml` file with the following
snippet:

```yaml
[[redirects]]
  from = "https://bbb.dev/*"
  to = "/.netlify/functions/smolify?path=:splat"
  status = 301
  force = true
```

This takes all traffic to `https://bbb.dev` and redirects it to the `smolify`
function. When redirecting, it adds the splat from the `from` filter as a
querystring parameter named `path`.

Remember the `path` parameter I was grabbing in the function? This is where it's
coming from.

## Wrap Up

Then I deployed everything to the site. All traffic to the short URL is
redirected to the Netlify function and I can add as many short codes as I need
by adding a record to my Fauna database.
