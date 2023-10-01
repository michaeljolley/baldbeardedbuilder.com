---
pubDate: 2023-10-03T00:00:00.000Z
title: Integrating a Notion Database with an Astro Site
image: https://res.cloudinary.com/dk3rdh3yo/image/upload/w_526,dpr_auto,f_auto/blog/integrating-notion-with-astro-sites/mast.png
image_alt: AI generated image of a neon rocket ship blasting off into space
description: A walkthrough showing how to integration Notion database content
  into an Astro site using the Notion API.
featured: 1
tags:
  - astro
  - jamstack
  - notion
summary: My entire life is planned & documented in Notion. How can I pull that
  content into my Astro site so I don't have to duplicate it in content
  collections?
snapshot: >-
  <p>It started with a steno pad in 1998. It was my first "office" job, and I needed a
  way to keep track of my tasks. I built a process of writing down my tasks as
  they came in, updating them as I worked on them, and crossing them off when they
  were done. It was a great system that made me feel productive and in control.</p>
  <p>My tasks were simpler then. They all had definitive steps and a clear end. Once
  I started working as an engineer, my tasks became more complex. While I had JIRA
  tickets, GitHub issues, and other tools to track my work, I still needed a way
  that made sense to me and could include those tasks that weren't associated with
  code.</p>
  <p>I found a good groove using OneNote for about 8 years but was never satisfied.
  As I started to focus more on content creation & scheduling, I needed something
  different. I went through a slew of tools like Notion & Obsidian, but nothing
  felt right. Then a friend took an hour or so to show me their setup in Notion
  and the light finally clicked. I've been hooked ever since and now I manage
  <b>everything</b> in Notion.</p>
  <p>As I was building a new version of my website, I knew I wanted to include my
  content schedule. All that data already existed in Notion, and I hoped to avoid
  duplicating it in an Astro content collection. So... I did what any
  lazy developer would do. I built a way to pull that data from Notion into my
  Astro site.</p>
---

It started with a steno pad in 1998. It was my first "office" job, and I needed a
way to keep track of my tasks. I built a process of writing down my tasks as
they came in, updating them as I worked on them, and crossing them off when they
were done. It was a great system that made me feel productive and in control.

My tasks were simpler then. They all had definitive steps and a clear end. Once
I started working as an engineer, my tasks became more complex. While I had JIRA
tickets, GitHub issues, and other tools to track my work, I still needed a way
that made sense to me and could include those tasks that weren't associated with
code.

I found a good groove using OneNote for about 8 years but was never satisfied.
As I started to focus more on content creation & scheduling, I needed something
different. I went through a slew of tools like Notion & Obsidian, but nothing
felt right. Then a friend took an hour or so to show me their setup in Notion
and the light finally clicked. I've been hooked ever since and now I manage
**everything** in Notion.

As I was building a new version of my website, I knew I wanted to include my
content schedule. All that data already existed in Notion, and I hoped to avoid
duplicating it in an Astro content collection. So... I did what any
lazy developer would do. I built a way to pull that data from Notion into my
Astro site.

## Getting Started with the Notion API

I'm not going to focus on how to set up a Notion database and populate it. I'll
assume you've already got that part done. The Notion API is documented well, but
to give you a quick shortcut, you'll need an API "integration token" and the ID
of your database.

### Get a Notion Integration Token

Within the Notion app, click on the "Settings & Members" button in the top
right corner. Then click on the "Connections" section under "Workspace." On the
connections screen, click the link at the bottom that says "Develop or manage
integrations". This will take you to the integrations page.

On the "My integrations" page, click the "+ New integration" button. This will
open the "Create a New Integration" form. Choose the Notion workspace that
contains your database and give your integration a name. Then click the "Submit"
button.

![Notion Create a New Integration form](https://res.cloudinary.com/dk3rdh3yo/image/upload/c_scale,f_auto/blog/integrating-notion-with-astro-sites/create-notion-integration_ierd3a.png)

Once you've created your integration, you'll be taken to the "Secrets" tab of
your new integration. Press the "Show" button to reveal and copy your "Internal
Integration Secret". This is your integration token and you'll need it later to
authenticate with the Notion API.

### Get the Notion Database ID

Getting the ID of your Notion database is a little more involved. You'll need to
open the Notion app in your browser and navigate to the database you want to
use.

![Example URL of a Notion Database](https://res.cloudinary.com/dk3rdh3yo/image/upload/c_scale,f_auto/blog/integrating-notion-with-astro-sites/notion-database-url_fj7ex6.png)

The ID of the database is the first alphanumeric string after your Notion
workspace name (highlighted in the image above). Copy that ID and save it for
the next step.

## Configuring Your Astro Project

Now that we have our database ID and our integration token, we need to set up our
project. First, we'll install the Notion JavaScript SDK.

```bash
npm install -D @notionhq/client
```

In the code snippet above, I install the SDK as a development dependency. This
is because my site is built statically and I don't need the SDK in my production
build. If you're building a server-side rendered site, you'll want to install
it without that flag.

Next, we'll need to create a `.env` file at the root of our project (if one
doesn't already exist.) Then add the following to the `.env` file:

```bash
NOTION_TOKEN = YOUR_NOTION_INTEGRATION_TOKEN
NOTION_DATABASE_ID = YOUR_NOTION_DATABASE_ID
```

Astro will pull these in auto-magically and we'll be able to use them in our
code later.

## Connecting to the Notion API

Now that our environment is set up, let's write some code. Remember that
this code is specific to my Notion database and schema so it will need to be
modified to fit the schema of your Notion database.

We'll start by creating a `notion.ts` file in the `src/scripts` directory. This
file will contain all the code we need to pull data from the Notion API and will
be referenced from any page or component that needs to use that data.

To start, copy the following into your `notion.ts` file:

```typescript
import { Client } from "@notionhq/client";

export type ScheduledEvent = {
  date: Date;
  title: string;
  description: string;
  type: string;
};

export async function getEvents(): Promise<ScheduledEvent[]> {
  return [];
}
```

The first thing we do is import the `Client` class from the Notion SDK. Then we
define a type that will represent our Notion data for the Astro site. In this
case, I'm using a `ScheduledEvent` type that contains a date, title,
description, and type. If you're using TypeScript, you'll want to modify this
to match the type definition of the object you'll be passing around your Astro
project.

Finally, we define an async function called `getEvents` that returns a promise
of an array of `ScheduledEvent` objects. This is the method we'll use throughout
our app's pages &amp; components to pull data from Notion. Let's fill in the
body of that function next. Add the following within the `getEvents` function:

```typescript
const notion = new Client({ auth: import.meta.env.NOTION_TOKEN });
```

This creates a new instance of the Notion client and passes in the integration
token we added to our `.env` file earlier.

### Querying the Notion API

Now we can query the Notion API to get our data. Add the following code to the
`getEvents` function:

```typescript
const pages = await notion.databases.query({
  database_id: import.meta.env.NOTION_CONTENT_DATABASE_ID,
  // Add a filter here.
});
```

This snippet will retrieve all the pages from our Notion database. However,
it's unlikely that you'd want to pull back all records. Be sure to add a filter
to narrow your request to just the pages you want. You can find out more about
the `filter` parameter of the `query` function in the
[Notion API documentation](https://developers.notion.com/reference/post-database-query-filter).

As an example, the filter for my implementation is below:

```typescript
filter: {
    and: [
      {
        property: 'Status',
        status: {
          equals: 'Staged',
        },
      },
      {
        or: [
          {
            property: 'Type',
            select: {
              equals: 'Long Form Video',
            },
          },
          {
            property: 'Type',
            select: {
              equals: 'Livestream',
            },
          },
          {
            property: 'Type',
            select: {
              equals: 'Short Form Video',
            },
          },
          {
            property: 'Type',
            select: {
              equals: 'Blog',
            },
          },
        ],
      },
    ],
  },
```

### Transforming the Notion API Response

The response from the Notion API is a bit verbose, and by "a bit" I mean
"a lot". We'll need to transform the response into something more manageable.
But like the filters above, this code will be very dependent on your Notion
schema and the type definition you want to use in your Astro project.

Here's the code I use to transform the response from the Notion API:

```typescript
const events = pages.results
  .map((page) => {
    let type = "";
    switch (page.properties.Type.select.name) {
      case "Long Form Video":
      case "Short Form Video":
        type = "YouTube";
        break;
      case "Livestream":
        type = "Twitch";
        break;
      case "Blog":
        type = "Blog";
        break;
    }
    return {
      id: page.id,
      title: page.properties.Name.title[0].plain_text,
      description: page.properties.Description.rich_text[0].plain_text,
      date: new Date(page.properties["Release Date"].date.start),
      type: type,
    };
  })
  .sort((a, b) => a.date.getTime() - b.date.getTime())
  .splice(0, 5);
```

In my case, I'm only ever going to want the next 5 events, so I use the `splice`
function to limit the number of events returned. That may be different for your
use case.

Finally, we return the array of events from the `getEvents` function making the
full function look like this:

```typescript
export async function getEvents(): Promise<ScheduledEvent[]> {
  const notion = new Client({ auth: import.meta.env.NOTION_TOKEN });
  const pages = await notion.databases.query({
    database_id: import.meta.env.NOTION_CONTENT_DATABASE_ID,
    filter: {
      and: [
        {
          property: "Status",
          status: {
            equals: "📆 Staged",
          },
        },
        {
          or: [
            {
              property: "Type",
              select: {
                equals: "Long Form Video",
              },
            },
            {
              property: "Type",
              select: {
                equals: "Livestream",
              },
            },
            {
              property: "Type",
              select: {
                equals: "Short Form Video",
              },
            },
            {
              property: "Type",
              select: {
                equals: "Blog",
              },
            },
          ],
        },
      ],
    },
  });

  const events = pages.results
    .map((page) => {
      let type = "";
      switch (page.properties.Type.select.name) {
        case "Long Form Video":
        case "Short Form Video":
          type = "YouTube";
          break;
        case "Livestream":
          type = "Twitch";
          break;
        case "Blog":
          type = "Blog";
          break;
      }
      return {
        id: page.id,
        title: page.properties.Name.title[0].plain_text,
        description: page.properties.Description.rich_text[0].plain_text,
        date: new Date(page.properties["Release Date"].date.start),
        type: type,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .splice(0, 5);

  return events;
}
```

## Using Notion Data in Your Astro Component

Now that we have our data, we can use it in a page or component. My use case
lists upcoming events on my homepage, so I created a `Schedule.astro` component.
Then I imported the `getEvents` function from the `notion.ts` file and wrote
the HTML to display it.

```tsx
---
import { getEvents } from 'src/scripts/notion';
const events = await getEvents();
---

<section>
  <h2>Schedule</h2>
  <ul>
    {
      events.map((event) => (
        <li>
          <strong>{event.title}</strong><br/>
          <date>{event.date.toLocaleDateString()}</date>
        </li>
      ))
    }
  </ul>
</section>
```

Whether your use case is similar or not, the process is the same. Accessing your
Notion data is fairly straightforward and can save you from duplicating content
in your Astro project.
