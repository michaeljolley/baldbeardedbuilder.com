---
pubDate: 2022-05-02T00:00:00.000Z
title: Updating Notion Cover Images with Pipedream and JavaScript
description: Using JavaScript and Pipedream to automate changing my Notion cover
  image each night.
image: https://res.cloudinary.com/dk3rdh3yo/image/upload/w_526,dpr_auto,f_auto/v1688273786/blog/how-to-update-notion-cover-image-with-javascript/entangled_neon_pipes_jjcdg5.png
image_alt: AI generated image of neon pipes entangled on a black background
tags:
  - notion
  - javascript
  - pipedream
featured: 2
summary: Using JavaScript and Pipedream to automate changing my Notion cover
  image each night.
ograph: https://res.cloudinary.com/dk3rdh3yo/image/upload/v1688750573/blog/how-to-update-notion-cover-image-with-javascript/ograph.png
---

Okay. I admit it. I have commitment issues. Well, at least when it comes to
cover images on my Notion dashboards. I've tried to pick images that are
aesthetically appealing, but I tend to get bored looking at the same thing day
after day.

## A Cry for Help

Now don't get me wrong, I'm just starting my journey with Notion. I've dabbled
with it multiple times but it always seemed like just another "note-taking" app.
Then I started seeing posts on Twitter from folks like
[Kurt Kemple](https://twitter.com/theworstdev). It was clear that I was missing
something. Every tweet or blog post I read made me realize I was fundamentally
misunderstanding what Notion is. So I put out a cry for help on Twitter.

![Image of tweet I sent asking for Notion help](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1651280565/blog/how-to-update-notion-cover-image-with-javascript/image-of-initial-tweet-for-notion-help.png)

Luckily, Kurt came to my rescue and spent more than an hour showing me how he
uses Notion to power his personal and professional life. To say it was
eye-opening would be an understatement. Weeks later, I'm still remembering
things he showed me and implementing them myself.

On top of all those databases and pages is a dashboard that I run my day from,
but I wanted a cool image across the top of the page. After realizing I'd never
find just the "right" picture, I remembered some of the things Kurt taught me,
like modifying things in Notion using JavaScript and
[Pipedream](https://pipedream.com/).

Now that you know the why, let's get to the how-to.

## What You'll Need

It could probably go without saying, but you'll need
[Notion](https://www.notion.so/) and [Pipedream](https://pipedream.com/)
accounts. Once you've got those, you'll need a page that you want to change. Of
course, you could do this for multiple pages, but for brevity, this tutorial
will show you how to do one.

### Gather Notion Info

Now that you've got a Notion account and have decided on a page to update, we'll
need to get the id of that page. If you're looking at the page in a browser, you
can get the id from the URL. If you're using the Notion app, you can right-click
on the page in the menu on the right and choose "Copy link". Then paste the link
to see it.

![Browser address bar showing a Notion Url](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1651285538/blog/how-to-update-notion-cover-image-with-javascript/notion-app-context-menu.png)

In the URL, you want the alphanumeric string after your Notion workspace name.
Sometimes the URL has the page name pre-pended to the id. That's the case in the
image below (`Hello-World-5b1db5ba47e64a6b958c4a8a71f5677b`). You'll want to
ignore the page name and dashes in the URL. Removing that leaves the actual id
of the page (`5b1db5ba47e64a6b958c4a8a71f5677b`).

![Browser address bar showing a Notion Url](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1651285413/blog/how-to-update-notion-cover-image-with-javascript/notion-browser-address-bar.png)

Now that we have the Notion page id, we can move forward with setting up
Pipedream.

## Connect your Notion and Pipedream Accounts

To access our Notion workspace from Pipedream, we need to connect our accounts.
In Pipedream, click on the "Accounts" menu option on the left. This will take
you to the Connected Accounts page, where you can click on the "Connect an App"
button on the far right. You will then see the "Select an App" modal window. Now,
type "Notion" in the "Search for an app..." input and select Notion in the
results.

![Pipedream Select an App window](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1651330319/blog/how-to-update-notion-cover-image-with-javascript/pipedream-connect-app.png)

You'll be asked to authenticate with Notion and allowed to choose which pages
Pipedream has access to. Be sure to allow access to the page you want to update.

## Creating the Pipedream Workflow

Now that Pipedream has access to our Notion account, we can create a workflow to
make changes there. Click on the "Workflows" menu option in the left sidebar.
Once the "Workflows" page has loaded, click the "New +" button on the far right.

### Creating a Workflow Trigger

All Pipedream workflows start with a trigger. I chose to update my cover image
every day, so I chose the "Schedule" trigger. Pipedream has a nice process for
taking you through selecting what recurrence and schedule you want for the
trigger. In my case, I have it run at midnight in my timezone every night.

![Pipedream workflow trigger](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1651333416/blog/how-to-update-notion-cover-image-with-javascript/pipedream-new-trigger.png)

### Updating Your Notion Page

With a trigger in place, let's add a step to update our cover image. Clicking
the plus sign under your trigger allows you to add a step to your workflow.
There are a **LOT** of integrations, but you should search for "notion" and
click on the Notion option. Then you'll be presented with multiple options for
integration. You'll be calling the Notion API with JavaScript so select the "Use
any Notion API" option.

![Pipedream add step interface](https://res.cloudinary.com/dk3rdh3yo/image/upload/v1651344533/blog/how-to-update-notion-cover-image-with-javascript/pipedream-add-notion-step.png)

This will open the step editor. You'll want to select your Notion account in the
"Select a Notion account..." drop down. Then it's time for the code. Pipedream
adds some code here that retrieves your Notion user record as an example, but
we'll completely remove that.

Then add the following code to the "Code" box. Be sure to update the
`YOUR_NOTION_PAGE_ID` string with the Notion page id you identified above.

```js
module.exports = defineComponent({
  props: {
    notion: {
      type: 'app',
      app: 'notion',
    },
  },
  async run({ steps, $ }) {
    try {
      const pageId = 'YOUR_NOTION_PAGE_ID'

      const data = {
        cover: {
          type: 'external',
          external: {
            url: `https://picsum.photos/1500/600?v=${Date.now()}`,
          },
        },
      }

      await require('@pipedreamhq/platform').axios(this, {
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: {
          Authorization: `Bearer ${this.notion.$auth.oauth_access_token}`,
          'Notion-Version': `2021-08-16`,
        },
        method: 'PATCH',
        data,
      })
    } catch (error) {
      console.log(error)
      throw error
    }
  },
})
```

The code above updates the page to use an external url. That external url is a
randomly generated image served by [picsum.photos](https://picsum.photos/) with
the appropriate dimensions for a Notion cover image. Each night your workflow
will update the URL to a new image generated by picsum.

## Turn it on

Now that we have a trigger and a step to run, all that's left to do is press the
"Deploy" button at the top right of the page. This will activate your workflow
and schedule it to run whenever you specified. You can also click on the workflow
and press the "Run Now" button to trigger it manually at any time.

Updating the cover image is pretty basic, but the principles learned can be
used to **really** extend what you're doing in Notion. In future blog posts,
I'll cover how I use Pipedream with Notion to create daily journals, follow up
with old colleagues and friends, and manage ideas for YouTube, Twitch, and blog
ideas.
