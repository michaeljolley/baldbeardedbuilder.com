# baldbeardedbuilder.com

This is the source for my personal site. It's where the blog posts live, where the
YouTube videos get indexed, and where folks sign up for The .NET Drip. If you're here
to fix a typo in a post, poke at the layout, or just see how the sausage gets made,
you're in the right place.

It's an [Astro](https://astro.build) site that builds to static files and deploys to
Netlify. Nothing fancy. That's on purpose.

## Get it running

You'll need Node 18 or newer and git.

```sh
git clone --recurse-submodules git@github.com:baldbeardedbuilder/website.git
cd website
npm install
cp .env-sample .env
npm run dev
```

That'll put the site on `http://localhost:4321`.

If you already cloned without `--recurse-submodules`, you'll get a very empty site and
some confusing errors. Fix it with:

```sh
git submodule update --init --recursive
```

### About that submodule

The content isn't in this repo. Blog posts, video metadata, and the content collection
schema all live in a separate private repo mounted at `src/content`. That means the
site build needs it, but you can't pull it unless you have access.

If you don't have access to the content repo, the build won't complete. Sorry about
that. It's a tradeoff I took on purpose so I can edit posts without touching the site
code, but it does make outside contributions harder. If you want to help with something
that needs content to render, open an issue and I'll figure out a way to unblock you.

## Environment variables

Copy `.env-sample` to `.env` and fill in what you need.

| Variable | What it does |
| :--- | :--- |
| `TWITCH_CLIENT_ID` | App credentials for the Twitch API |
| `TWITCH_CLIENT_SECRET` | App credentials for the Twitch API |
| `TWITCH_CHANNEL_ID` | Reserved, not currently read by the site |
| `TWITCH_ACCESS_TOKEN` | Reserved, the code fetches its own token at build time |
| `SUPABASE_URL` | Reserved, not currently read by the site |
| `SUPABASE_ANON_KEY` | Reserved, not currently read by the site |
| `HOST` | Reserved, not currently read by the site |

The Twitch credentials are the only ones the build actually uses right now. They power
the "Live on Twitch Now" state on the homepage. Without them, the homepage build will
fail when it tries to call the Twitch API. The rest are leftovers from earlier versions
that I've left in the sample so I remember what the deployed environment expects.

## Commands

| Command | What it does |
| :--- | :--- |
| `npm install` | Installs dependencies |
| `npm run dev` | Dev server on `localhost:4321` |
| `npm run build` | Builds the production site to `./dist/` |
| `npm run preview` | Serves the built site so you can check it before deploy |
| `npm run astro ...` | Runs Astro CLI commands like `astro check` |

Both `package-lock.json` and `pnpm-lock.yaml` are checked in. npm is what CI uses, so
that's the safe choice.

## How it's laid out

```text
public/            static assets, redirects, netlify.toml
src/
  components/      the reusable pieces (cards, sections, header, footer)
  content/         git submodule, all posts and video metadata
  layouts/         Layout.astro wraps every page
  pages/           file-based routing, each file is a route
  scripts/         twitch.ts and publish.ts, the bits of real logic
  styles/          global.css
```

A few things worth knowing before you go editing:

**Posts publish themselves.** `src/scripts/publish.ts` decides whether a post is live
based on its `pubDate` and an 8 AM Central publish time. It does its own daylight saving
math instead of pulling in a date library. That's a small amount of code doing a job a
dependency could do, and I'd rather own the fifty lines than the dependency tree.

**Future posts get one preview page.** `src/pages/blog/[slug].astro` generates pages for
every published post plus exactly one upcoming post, rendered as a teaser. Everything
further out doesn't exist yet as far as the site is concerned.

**Twitch is checked at build time, not in the browser.** The homepage calls the Twitch
API during the build. So the "live now" badge is only as fresh as the last deploy. Good
enough for what it does, and it keeps the page static.

**Old URLs are honored.** `public/_redirects` and `public/netlify.toml` map a decade of
old blog paths to their current homes. If you rename a post slug, add the redirect.
Somebody out there has that link bookmarked.

## Contributing

Found a typo in a post? The post itself lives in the content submodule, so open an issue
here and I'll get to it. Found something broken in the site (layout, accessibility, a
link that goes nowhere, a build that falls over)? Pull requests are welcome.

Keep changes focused. One idea per PR is easier for both of us.

## When this repo isn't what you want

If you're looking for an Astro blog starter you can fork and make your own, this isn't
it. The content is private, the styling is very much mine, and there's site-specific
logic baked in all over. Start from `npm create astro@latest` instead. You'll have a
better time.

But if you want to read how a real site handles scheduled publishing, build-time API
calls, or a decade of URL redirects, dig in. That's the useful part.

## License

MIT. See [LICENSE](./LICENSE).

The code is MIT. The blog posts, videos, and branding are not. Please don't repost the
writing as your own.
