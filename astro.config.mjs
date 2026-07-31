// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://baldbeardedbuilder.com',
  trailingSlash: 'always',
  output: 'static',
  adapter: netlify(),
  devToolbar: {
    enabled: false
  },
  integrations: [
    // Options live in ec.config.mjs. See the comment at the top of that file.
    expressiveCode(),
    preact({ compat: false }),
    sitemap({
      // Profiles are noindex by decision 14, so they stay out of the sitemap too.
      filter: (page) => !page.includes('/builders/')
    })
  ]
});
