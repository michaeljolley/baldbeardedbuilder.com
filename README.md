# baldbeardedbuilder.com

The personal site of Michael Jolley, the Bald Bearded Builder. Articles, videos,
dev disasters and the .NET Drip signup. Built with Astro, deployed on Netlify,
with Supabase behind the parts that need an account.

## Running it

```sh
pnpm install
pnpm dev
```

That serves on `localhost:4321`. Use pnpm, not npm.

Versions are pinned in two places on purpose and they have to agree: `packageManager`
in `package.json` (currently `pnpm@9.1.1`) and `PNPM_VERSION` in `netlify.toml`
(currently `9`). Bumping one without the other means local and production build
with different tooling, which is the kind of difference that shows up as a broken
deploy and nothing else. `netlify.toml` also pins `NODE_VERSION = "24"`, while
`engines` asks only for Node 22 or newer, so local can be older than production.

## The content is a submodule

`src/content` is a git submodule pointing at `michaeljolley/content`, which is a
private repository. Without it every collection is empty, the site builds to
almost nothing, and any check you run passes for the wrong reason.

```sh
git submodule update --init --recursive
```

Treat it as read only from here. Anything that would mean editing frontmatter
across the submodule belongs in `src/config/` instead.

CI needs a token to read it, since the default `GITHUB_TOKEN` cannot clone
another repository. That is the secret `CONTENT_TOKEN`.

## Generated files, and why the build fights you about them

`pnpm gen` runs automatically before every build and at the start of `pnpm dev`.
It writes:

| Output | From |
| :-- | :-- |
| `src/styles/themes.css`, `src/lib/themes.generated.ts`, `src/lib/ec-themes.generated.mjs` | `scripts/gen-themes.mjs`, which resolves real VS Code themes through shiki |
| `src/styles/fonts.generated.css` | `scripts/gen-fonts.mjs` |
| `src/config/taxonomy.json` | `scripts/gen-taxonomy.mjs` |
| `public/_redirects` | `scripts/gen-redirects.mjs` |

**Never hand edit any of those.** Edit the generator. `pnpm gen:check` fails the
build if a generated file differs from what its generator produces, which is
what stops a hand edit surviving to production.

## Checks

```sh
pnpm test              # unit and redirect tests
pnpm check             # astro check
pnpm check:migrations  # the SQL chain is self contained
pnpm check:dist        # parked routes, sitemap and Pagefind agree with the routes
pnpm check:layout      # thumbnail crop and dead space, measured in a browser
pnpm a11y              # axe, WCAG 2.2 AA
pnpm perf              # Lighthouse budget
```

`pnpm check:dist`, `check:layout`, `a11y` and `perf` all read `dist`, so run
`pnpm build` first.

`pnpm verify:deploy` runs against a deployed URL rather than a local build. It is
the only check that can catch a Netlify setting being wrong, because everything
else passes happily on a machine where those settings do not apply.

## Further reading

- `docs/deploy.md` for Netlify build settings and the branch deploy.
- `docs/new-project.md` for standing up the Supabase project, including the
  GitHub OAuth callback trap that repoints production sign in if you get it
  wrong.
- `docs/backfill.md` and `docs/notifications.md` for the parked pieces.
