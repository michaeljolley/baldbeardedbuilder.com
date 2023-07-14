---
pubDate: 2022-03-10T00:00:00.000Z
title: Building 404 Pages That Bring Joy
description: How we transformed the bad experience of landing on a 404 page into
  an enjoyable experience with a game.
image: https://res.cloudinary.com/dk3rdh3yo/image/upload/w_526,dpr_auto,f_auto/v1688345523/blog/building-404-pages-that-bring-joy/neon_computer_monitor_with_smiley_face_sneepa.png
image_alt: AI generated image of a neon computer with a smiley face on a black background
tags:
  - developer-experience
  - nuxtjs
summary: How we transformed the bad experience of landing on a 404 page into an
  enjoyable experience with a game.
canonical_url: https://developers.deepgram.com/blog/2022/03/building-404-pages-that-bring-joy/
ograph: https://res.cloudinary.com/dk3rdh3yo/image/upload/v1688749757/blog/building-404-pages-that-bring-joy/ograph.png
---

You clicked on that link with high expectations. You knew you were about to find
the answers you'd been searching for. Then it happened. You saw the dreaded 404
error letting you know that the content you were looking for wasn't there. Maybe
the content lives at a new location or perhaps it's been permanently removed.
Regardless of the reason, your high hopes have been dashed and you're left to
begin your search again.

It's a terrible experience and one we wanted to make better. But before we get
into the details of what we've done, let's talk about where the idea started.

## To Those About to Hack, We Salute You

At Deepgram, we have a goal that every interaction with us should be pleasant
and (hopefully) enjoyable. We spend a lot of time thinking of how to make that
happen. One of the methods we use for brainstorming ideas and gathering feedback
is hosting internal hack-a-thons (known internally as GRAMJAMs.) Last year, 8
teams competed to be the GRAMJAM champion and one of the entries was a super
fun game called MadGab.

![GRAMJAM 2021 logo](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1650409604/blog/building-404-pages-that-bring-joy/gj2021.webp)

The premise was simple: present the user with a nonsensical phrase that is
phonetically similar to a real-life phrase. Players would read the nonsensical
phrase aloud and attempt to then say the associated real-life phrase. An example
would be "mass turk hard" in the place of "Mastercard." It was a great
experience. The game's format was simple to understand and perform and it was
highly addictive. We knew immediately that we had to make this available for
others. This brings us back to the 404 page.

## Making it Helpful

We knew we couldn't just have a game on our 404 page. While it's a fun
distraction, we realized that the visitor came with a purpose. That purpose
needed to be our number one priority. How could we help them reach their
objective?

### Can We Find What You're Looking For?

Wouldn't it be great if we could "guess" what you were looking for and provide
you with a link to it? Fortunately, as we've built our site, we've tried to do
a good job of creating routes that consist of keywords associated with the
content of the page. This means we can assume that parsing a route (even one
that resulted in a 404) should provide keywords that are relevant to what the
user was trying to reach.

We then send those parsed words to Algolia to search our site and display the
three most relevant results to the user. With a little luck, the results shown
will provide the information the visitor was looking for and they're only a
click away from continuing their journey.

![Search results on the 404 page](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1650411275/blog/building-404-pages-that-bring-joy/results.webp)

### Quick Access to Search

What if there were no results or the results didn't meet the user's need. Without
additional information, we can't move the user forward. So we added a search
input to the page to give quick access to finding what they're looking for. Yes,
we have a search bar on the top of every page in the navigation, but we don't
want users to expend unnecessary brain power trying to find it. Putting the
search input front-and-center allows them to be on their way as efficiently as
possible.

![Search bar on the 404 page](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1650409604/blog/building-404-pages-that-bring-joy/search-bar.webp)

Now that we've done all we can to provide relevant information and paths
forward, let's try to brighten their day by providing a chance to have fun
before they move on.

## Making it Enjoyable

After some brainstorming, we had a list of requirements to recreate MadGab on
our platform:

- Any API keys should remain on the server, or be short-lived (i.e. less than 5 minutes)
- Store the collection of gibberish phrases/answers on the server to protect them from cheaters 😁

We hope to open-source MadGab in the future, but, for now, I'll share how we
achieved the goals above.

![Screenshot of the MadGram game on our 404 page](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1650409604/blog/building-404-pages-that-bring-joy/madgram.webp)

### Protecting API Keys

MadGab connects to the Deepgram API via a WebSocket and sends audio from the
users' microphone to be transcribed. This requires us to send an API key in the
header of that connection. That means an API key will be exposed to the client.
To minimize any risk, we wanted to use short-lived API keys. Because the
developer platform is hosted on Netlify, functions seemed like a good option for
providing a way to create a temporary API key to use for the game.

Luckily for us, the Deepgram API allows creating API keys with a specified
time-to-live. So we imported the Deepgram Node SDK and use it to create a key
that lives for 5 seconds. That's just long enough for our front-end to connect
to the Deepgram API before it expires. Below is the code for the Netlify
function that generates and returns the API key.

```js
const { Deepgram } = require('@deepgram/sdk')
require('dotenv').config()

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY)
const deepgramProjectId = process.env.DEEPGRAM_PROJECT_ID

exports.handler = async function (event, context) {
  try {
    const key = await deepgram.keys.create(
      deepgramProjectId,
      'Temp 404 key',
      ['member'],
      {
        timeToLive: 5,
      }
    )

    return {
      statusCode: 200,
      body: JSON.stringify(key),
    }
  } catch (err) {
    console.log(err)

    return {
      statusCode: 500,
    }
  }
}
```

### No Peeking at the Answers

Our teams at Deepgram had already collected a list of phonetic phrases matched
with the actual word phrases, so we were able to use that list in the game.
While we could have created an array of those phrases in our component, we
didn't want users to be able to find them in the code and cheat. To solve this,
we created another Netlify function that could be called to return phrases
on-demand.

Each phrase is defined as an object with three properties:

- `id`: a unique identifying number for the phrase
- `suggestion`: the phonetic phrase
- `result`: the phrase to be spoken

To prevent the need to call the function after every round of the game, the
function returns up to three phrase objects at a time. However, we don't want to
send the same phrase to the same user until they've played every phrase
available. This requires us to track which phrases the user has played on the
client side. Then, each time we request new phrases, we'll send an array of the
ID's of each phrase the user has played in the body of the request. So the first
thing the function should do is ensure the request is sent via HTTP `POST`.

```js
// Only allow POST
if (event.httpMethod !== 'POST') {
  return {
    statusCode: 405,
    body: 'Method Not Allowed',
    headers: {
      Allow: 'Get',
    },
  }
}
```

Next, it will parse the request body to get the id's of the phrases the user has
already attempted.

```js
const userChoices = []
if (event.body !== undefined) {
  const req = JSON.parse(event.body)
  userChoices.push(...req.choices)
}
```

Currently, our phrases are stored in an array inside the function and called
`choices`. So the next step is to filter the `choices` array to remove any
previously used phrases. If we've reached the end of choices, then we restart the
game and begin sending previously used phrases again. We'll also set the
`restart` variable to true and return that as well. This notifies the
client-side that we've restarted and it should clear its cache of previously
used phrases.

```js
let restart = false
const availableChoices = choices.filter((f) => !userChoices.includes(f.id))
if (availableChoices.length === 0) {
  availableChoices.push(...choices)
  restart = true
}
```

Now we want to select three random choices from `availableChoices`. To do that,
we created a `getRandomChoice` function that can return a random phrase from
`availableChoices`.

```js
function getRandomChoice(availableChoices) {
  const randomNumber = Math.floor(Math.random() * availableChoices.length)
  return availableChoices.splice(randomNumber, 1)[0]
}
```

Then we can call that function three times to gather the three phrases to return
to the client-side. If less than three phrases remain, we just return the
remaining phrases.

```js
if (availableChoices.length > 3) {
  selectedChoices.push(getRandomChoice(availableChoices))
  selectedChoices.push(getRandomChoice(availableChoices))
  selectedChoices.push(getRandomChoice(availableChoices))
} else {
  selectedChoices.push(...availableChoices)
}
```

Finally, we return the `selectedChoices` array and the `restart` boolean to the
client-side.

```js
return {
  statusCode: 200,
  body: JSON.stringify({
    restart,
    choices: selectedChoices,
  }),
}
```

## Better Experiences are a Core Value

At the heart of this project is a desire to provide a better experience for
developers. Our team at Deepgram spends a LOT of time focused on how to make
that happen. From the experience of signing up, working in our console, using
our SDKs, and yes, even our 404 page. We want every encounter with Deepgram to
be informative, helpful, and pleasant. So while 404 pages interrupt your flow of
work, hopefully, these changes empower you to find what you need faster, while
also providing an enjoyable experience.
