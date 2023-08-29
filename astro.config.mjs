import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import compress from 'astro-compress';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: `https://baldbeardedbuilder.com`,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        page !== 'https://baldbeardedbuilder.com/thanks-r/' &&
        page !== 'https://baldbeardedbuilder.com/thanks-bd/' &&
        page !== 'https://baldbeardedbuilder.com/404/' &&
        page !== 'https://baldbeardedbuilder.com/styles/article/' &&
        page !== 'https://baldbeardedbuilder.com/styles/article-toc/',
    }),
    compress({
      logger: 0,
    }),
  ],
});
