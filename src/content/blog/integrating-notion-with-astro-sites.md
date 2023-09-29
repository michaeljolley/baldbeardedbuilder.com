---
pubDate: 2023-10-03T00:00:00.000Z
title: Integrating Notion with Astro Sites
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
---

It started with a steno pad in 1998. It was my first "office" job and I needed a
way to keep track of my tasks. I built a process of writing down my tasks as
they came in, updating them as I worked on them, and crossing them off when they
were done. It was a great system that made me feel productive and in control.

My tasks were simpler then. They all had definitive steps and a clear end. Once
I started working as an engineer, my tasks became more complex. While I had JIRA
tickets, GitHub issues, and other tools to track my work, I still needed a way
that made sense to me and could include those tasks that weren't associated with
code.

I found a good groove using OneNote using OneNote for about 8 years, but I was 
never completely satisfied. As I started to focus more on content creation & 
scheduling, I needed something different. I went through a slew of tools like
Notion & Obsidian, but nothing felt right. Then a friend took an hour or so to
show me their setup in Notion and the light finally clicked. I've been hooked
ever since and now I manage **everything** in Notion.

When I was building a new version of my website, I knew I wanted to include my
schedule of content. All that data already existed in Notion and I didn't like
the idea of duplicating it in an Astro content collection. So... I did what any
lazy developer would do. I built a way to pull that data from Notion into my
Astro site.

## Getting Started with the Notion API

I'm not going to focus on how to setup a Notion database and populate it. I'll
assume you've already got that part done. The Notion API is documented well, but
to give you a quick shortcut, you'll need an API "integration token" and the ID
of your database.

### Getting the Integration Token

Within the Notion app, click on the "Settings & Members" button in the top 
right corner. Then click on the "Connections" section under "Workspace." On the
connections screen, click the link at the bottom that says "Develop or manage
integrations". This will take you to the integrations page. Click the "Create