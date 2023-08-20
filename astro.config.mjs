import { defineConfig } from 'astro/config';
import compress from 'astro-compress';
import sitemap from '@astrojs/sitemap';

import preact from '@astrojs/preact';

import codeTheme from './code-theme.json';

// https://astro.build/config
export default defineConfig({
  site: `https://baldbeardedbuilder.com`,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) =>
        page !== 'https://baldbeardedbuilder.com/thanks/' &&
        page !== 'https://baldbeardedbuilder.com/404/',
    }),
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
});
