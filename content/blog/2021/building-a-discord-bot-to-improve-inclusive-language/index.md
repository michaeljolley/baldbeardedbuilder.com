---
date: 2021-08-22
title: 'Building a Discord Bot to Improve Inclusive Language'
cover: ./cover.png
ograph: ./ograph.png
slug: building-a-discord-bot-to-improve-inclusive-language
banner_image_alt: Discord channel where the GuyBot has responded to a non-inclusive message.
description: Helping Discord members use more inclusive language by building a bot using JavaScript & Fauna and hosted by Azure in a Docker container.
tags: [discord, inclusion, fauna, azure]
---

Growing up in the Southeast US, the word "guys" was used to denote everyone.
Sure we had other words that meant the same; y'all, folks, and everybody to
name a few, but no one thought twice about calling to a group of people with
"hey guys." Heck, even though my immediate family includes my wife and two
daughters, I've found myself calling to my family with a "hey guys." But I
can do better.

I've been working over the last year to be more intentional with the words I
use; understanding that they can and do affect others in ways that I hadn't
considered in the past. That said, this isn't a post about why inclusive
language matters. There are plenty of resources out there to consume and
learn from. In this post, I want to share my experience in building a Discord
bot using TypeScript, [Fauna](https://fauna.com), [Docker](https://docker.com),
and [Azure](https://azure.com).

<!--more-->

> Want to jump straight to the code, check out the [GitHub
> repository](https://github.com/michaeljolley/discord-guy-bot). Want to add
> the bot to your Discord? Visit [https://guybot.app](https://guybot.app).

## What Should I Build?

Learning to build a Discord bot has been on my to-do list for a while now,
but I hadn't really thought about _what_ I wanted it to do. Then I remembered
a project built by a friend of mine, [Luke Oliff](https://twitter.com/lukeocodes).
Luke built a Slack bot that monitored messages for the word "guys." It then
sent an ephemeral message to the author alerting them to the opportunity to
use more inclusive language.

I know what you're thinking. "Wait... isn't that exactly what you said this
Discord bot was going to do?" Well, my friend, yes. Yes, I completely
plagiarized Lukes' idea. 😁

## Goals

Before I started, I decided on a few things I wanted it to do:

- Monitor the Discord server 24/7 for "guys" in messages
- Send a message to the author of the message with ideas for using more
  inclusive language
- Host a site where others could invite the bot to their Discord server
- Deploy automatically when I push changes to the `main` branch

I also wanted to make sure that the bot showed grace on the first offense. You
can only send ephemeral messages in Discord if the user is using an interaction.
In this case, they had only sent a message. So the only options were to reply
in the channel they used or send them a direct message.

In order for the bot to seem more friendly, I decided to send the author a
direct message on the first offense so they wouldn't feel attacked or
"called out" in front of everyone on the Discord server. However, subsequent
offenses within 30 days would cause the bot to reply to the message in the
channel they had sent the message to and address them specifically.

Finally, I decided that in both cases, I'd add a reaction to their message
with the GuyBot "robot" logo to denote to everyone that the bot was on the job.

## Getting Started

I knew I wanted to use TypeScript, so after a quick `npm init`, I installed
the following packages:

```bash
npm i discord.js dotenv express faunadb
npm i -D @types/express @types/ws copyfiles typescript
```

> Technically, I installed other packages. Like prettier, eslint, and jest. But
> those packages are irrelevant to the goals of this post and are only used
> for making things pretty and tested.

The `src` directory will hold all my TypeScript code and it should be compiled
to the `dist` directory. So I added a `tsconfig.json` file to the root of my
project with the following:

```javascript
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDirs": [
      "./src",
      "./tests"
    ],
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true
  },
  "exclude": [
    "node_modules",
    "**/*.test.ts"
  ],
  "include": [
    "src"
  ]
}
```

## Setting up Fauna

If I want to respond differently based on the number of times a user has sent
"guys" into a Discord server, I'm going to have to track those events. There are
several ways I could have accomplished that, but I've really enjoyed using Fauna
for personal projects. They make it easy to get up and running quickly and I
know I've got the power of scale ready at a moment's notice. So I set up a
database in Fauna called "guybot".

<v-image
  alt="UI for creating a database within Fauna"
 src="./fauna-create-db.png"></v-image>

With the database ready, I thought through what my data should look like. I
settled on the structure below:

```typescript
{
 "user": String, // The id of the user in Discord
 "createdAt": Number, // Will be the timestamp of the offending message
 "guild": String // The id of the Discord server. Discord calls these guilds so I kept their nomenclature
}
```

Because these records reflect every time the bot has notified a user of the
potential to use more inclusive language, I decided to call these objects
`Notices`. So I created a collection in my new database and named it `notices`.

<v-image
  alt="UI for creating a collection within Fauna"
 src="./fauna-create-collection.png"></v-image>

I'll need to look up the history for each user when they send an offending
message. In Fauna, indexes are perfect for data reads that include filters
and need to be fast. I created one called `notices_by_user_guild` and
specified that it should be based on the `user` and `guild` properties.

<v-image
  alt="UI for creating an index within Fauna"
 src="./fauna-create-index.png"></v-image>

Now that my database is ready &amp; waiting, it's time to write some code
to utilize it. In my `src` directory, I created a new file called `fauna.ts`.
My plan is to keep all the data logic here and utilize it wherever I need it
throughout the application. I won't go through every line of code here because
you can always check out
[the code](https://github.com/michaeljolley/discord-guy-bot) for yourself. But I
do want to point out the two methods that actually mean something:

### getNoticesByUser

The `getNoticesByUser` function uses Fauna's FQL to call the index we created
and return any notices sent to a specific user on a specific server.

```typescript
static async getNoticesByUser(user: String, guild: String): Promise<Notice[] | undefined> {
 if (!this.client) {
  return undefined
 }

 let notices: Notice[] | undefined
 try {
  const response = await this.client.query<FaunaResponse>(
   query.Map(
    query.Paginate(
     query.Match(query.Index("notices_by_user_guild"), user, guild)),
    query.Lambda("notices", query.Get((query.Var("notices"))))
   )
  )
  if (response.data && response.data.length > 0) {
   const data = response.data as FaunaDocument[]
   notices =  data.map(m => this.mapResponse(m))
  }
 }
 catch (err) {
  console.log(`Fauna:getNoticesByUser - ${err}`)
 }
 return notices
}
```

### saveNotice

The `saveNotice` function saves the notice to Fauna. Nothing complicated here,
but I do use Fauna's FQL for this as well.

```typescript
static async saveNotice(notice: Notice): Promise<Notice | undefined> {
 if (!this.client) {
  return undefined
 }

 let savedNotice: Notice | undefined

 try {
  const response = await this.client.query<FaunaDocument>(
   query.Create(query.Collection("notices"), {
    data: notice
   })
  )
  savedNotice = this.mapResponse(response)
 }
 catch (err) {
  console.log(`Fauna:saveNotice - ${err}`)
 }
 return savedNotice
}
```

### Abstract + Static

One thing that is probably good to point out is that `fauna.ts` file exports an
`abstract class FaunaClient`. Each public method in that class is `static`. I
chose that pattern so that later I could simply call
`FaunaClient.saveNotice(notice)` without having to instantiate the FaunaClient
everywhere I needed it.

### Environment Variables

Fauna requires a secret to authenticate and Discord will need a token. To keep
those safe, I planned to add them as environment variables. So I created a
`.env` file with `DISCORD_TOKEN` and `FAUNADB_SECRET`. My `.gitignore` file
prevents them from being committed to GitHub and I'll add them to the
environment when the bot is actually running in production.

## Build-A-Bot

The logic of the Discord bot will live in a file called `bot.ts`. It will listen
for Discord to send messages to it and will review each message for any
violations. Currently, it looks for the use of the word "guys" within the first
ten words of a message. My thinking was that you'd address a group early in the
message, but might use the word appropriately later. For instance, if you were
talking about the game "Fall Guys."

### handleViolation

The moneymaker of the entire bot is the `handleViolation` function. This
function is called when we determine there is a potential to use more inclusive
language. It first checks to see how many times the author of the message has
been notified in the current Discord server, but disregards anything older than
30 days. _We err on the side of grace._

If the author hasn't had a notice in that time frame, we send them a direct
message with the following wording:

> Please bear in mind that the makeup of ${discordServer} is very diverse, and
> some people feel excluded by the use of the term “guys”. Maybe you could try
> using _people_, _team_, _all_, _folks_, _everyone_, or _yall_? Thanks for
> helping us make sure everyone feels welcome here.

If the author has been sent a notice within 30 days, we send the same message
prefixed with their username. (i.e. @user, Please bear in ...) The difference
is that for repeat offenders, we send the message in the same Discord channel
they sent their message. That means that everyone on the server sees that they
were addressed.

In both cases, a "GuyBot Robot" emote reaction is added to the offending
message. That way all users of the Discord server can see that the GuyBot
notified the user of an opportunity to use more inclusive language.

```typescript
async function handleViolation(message: Message): Promise<void> {
	const discordServer = message.guild
		? `the ${message.guild.name} Discord server`
		: 'this Discord'
	const messageBody = `Please bear in mind that the makeup of ${discordServer} is very diverse, and some people feel excluded by the use of the term “guys”. Maybe you could try using _people_, _team_, _all_, _folks_, _everyone_, or _yall_? Thanks for helping us make sure everyone feels welcome here.`

	let previousNotices = await FaunaClient.getNoticesByUser(
		message.author.id,
		message.guild?.id || ''
	)

	await message.react('guybot:879023217149358121')

	// Show a little grace. If the person hasn't said guy in
	// over a month, give them a little slack.
	if (previousNotices) {
		const lastMonth = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 1)
		previousNotices = previousNotices.filter(
			(f) => f.createdAt >= lastMonth.getDate()
		)
	}

	// If a repeat offender, put them on blast in the channel
	if (previousNotices && previousNotices.length > 0) {
		await message.reply(messageBody)
	}
	// Send a DM to discreetly let them know about the servers expectations
	else {
		const dmChannel = await message.author.createDM()
		dmChannel.send(messageBody)
	}

	await FaunaClient.saveNotice({
		user: message.author.id,
		createdAt: Date.now(),
		guild: message.guild?.id || '',
	})
}
```

### run

To start listening to Discord and reacting, we export a function called `run`.
This function connects to Discord and listens for any messages that are sent in
Discord servers it's been invited to. It checks every message and determines
whether to call the `handleViolation` function.

```typescript
export async function run(): Promise<void> {
	try {
		const client = new Client({ partials: ['USER', 'REACTION', 'MESSAGE'] })
		FaunaClient.init()

		client.once('ready', () => {
			if (client.user) {
				console.log(`Logged in as ${client.user.tag}!`)
			}
		})

		client.on('message', async (message: Message) => {
			const firstWords = message.cleanContent
				.toLocaleLowerCase()
				.split(' ')
				.slice(0, 9)

			if (firstWords.find((f) => f.includes('guys'))) {
				await handleViolation(message)
			}
		})

		await client.login(process.env.DISCORD_TOKEN)
	} catch (error) {
		console.log(error)
	}
}
```

## Allowing Others to Use the GuyBot

Of course, I plan to use this bot in Discords I manage, but I want others to be
able to do so as well. So I decided to build a small, one-page site that
includes a link to invite the bot to your Discord server. I didn't have time to
design/build all of it myself, so I found a nice template on Envato and removed
90% of it to just what I needed. All those assets I loaded into a `public`
directory and then created an `index.js` to serve as my Express app to serve
the pages up.

```typescript
import dotenv from 'dotenv'
import { run } from './bot'

import Express from 'express'
const app = Express()
const port = 80

dotenv.config()

run()

app.use(Express.static('public'))

app.listen(port, () => {
	console.log(`Example app listening on port: ${port}`)
})
```

Because that file is what will be executed on startup, I imported the `run`
function we created earlier and do everything here. The bot will be started and
Express will start serving the contents of the `public` directory as soon as it
begins.

## Docker all the Things

I love putting things in Docker containers. It's such a nice way to make sure my
development and production environments are consistent. So I added a
`Dockerfile` to the root of the project with the following:

```docker
FROM node:12.6.0-alpine as build

ARG BUILDVERSION=0.0.0

WORKDIR /app

# Copy dependency files
COPY ./package.json ./

# Clean install depdenencies
RUN npm i --silent

# Copy the rest of the files
COPY ./ .

# Build the application
RUN npm run build

# Put together the release image with the just build artifacts
FROM node:12.6.0-alpine

WORKDIR /app

# Copy dependency files
COPY ./package.json ./

# Clean install production-only dependencies
RUN npm i --silent --only=production

# Copy built project
COPY --from=build /app/dist ./

EXPOSE 80

CMD [ "node", "index.js" ]
```

This file creates a Node.js environment, installs all dependencies, and builds
my application. Then it creates a new container and copies the `dist` folder
from the original. This way the final image only has the files needed to run the
application without the original source code.

It's probably important to note how I build the application. Since it's written
in TypeScript, I need to compile it to JavaScript. Using `tsc` will do this for me,
but there are other important things to do. Below are the scripts from my
`package.json` file. Notice the `build` command. I use the copyfiles package to
move the static content of the website to the `dist` directory. That way they
will be included in the copy to the final Docker image.

```javascript
"scripts": {
 "build": "tsc && copyfiles -E -u 1 \"src/public/**/*\" dist",
 "format": "prettier --write **/*.ts",
 "format-check": "prettier --check **/*.ts",
 "lint": "eslint src/**/*.ts",
 "test": "echo \"Error: no test specified\" && exit 1"
},
```

## Continuous Deployments with GitHub &amp; Azure

I love continuous deployments. It's not the consistent deployment process or
that they help ensure my code builds correctly before it goes to production. If
I'm being honest, it's because I'm lazy. Anytime I can automate a task and not
do it myself, I'm all in. Luckily, GitHub Actions make building CD processes
quick and painless.

In this instance, I'm running the Docker container in an Azure Web App that
already has the environment variables I need set up. I also have an Azure
Container Registry that hosts the Docker images the web app needs. So in my
GitHub Action, I only need to build the Docker image and push it to my Azure
Container Registry.

```yml
name: CD

on:
  push:
    branches: [main]
jobs:
  deploy:
    if: ${{ github.event.head_commit.committer.name != 'Versioning Action' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          token: ${{ secrets.KEY }}
      - uses: tool3/bump@master
        id: bump
        with:
          github_token: ${{ secrets.KEY }}
          user: 'Versioning Action'
          email: 'versioning@github.com'
          branch: 'main'
      - uses: azure/docker-login@v1
        with:
          login-server: ${{ secrets.ACR_LOGIN }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      - name: 'Push images to ACR'
        run: |
          echo "${{ steps.bump.outputs.version }}"
          docker build . --tag ${{ secrets.ACR_LOGIN }}/guybot:${{ steps.bump.outputs.version }} --tag ${{ secrets.ACR_LOGIN }}/guybot:latest
          docker push ${{ secrets.ACR_LOGIN }}/guybot:${{ steps.bump.outputs.version }}
          docker push ${{ secrets.ACR_LOGIN }}/guybot:latest
```

Now any time I push new code to the `main` branch, the GitHub Action updates the
version number of my `package.json` and commits that back to the repository.
Then it builds an image tagged with `latest` and the version number and pushes
both of them to Azure.

The Azure Web App is set to automatically pull changes to the `latest` image and
redeploy itself.

## Wrap Up

This was such a fun, and useful, project to start with. It certainly gave me
some exposure to building bots for Discord and has opened up some ideas that
I'll attack in future projects.

If you'd like to add the bot to your discord, visit
[https://guybot.app](https://guybot.app) for an easy link to invite it to your
server.
