import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import compress from 'astro-compress'
import preact from '@astrojs/preact'

import codeTheme from './monochrome-dark.json'

// https://astro.build/config
export default defineConfig({
  site: `https://baldbeardedbuilder.com`,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    tailwind({
      config: {
        applyAstroPreset: false,
      },
    }),
    sitemap(),
    preact(),
    compress({
      logger: 0,
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: codeTheme,
    },
  },
})
