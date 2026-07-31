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
      filter: (page) => !page.includes('/builders/'),

      /*
        Submit is rendered on demand, because it has to know whether the reader is signed
        in before it draws a form that needs a sign in. On demand pages are invisible to
        the sitemap, and this one is a page people should be able to find, so it goes back
        in by hand. Report is deliberately not here: it is noindex.
      */
      customPages: ['https://baldbeardedbuilder.com/submit/']
    })
  ]
});
