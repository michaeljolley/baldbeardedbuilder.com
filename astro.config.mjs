import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from "@astrojs/preact";
import prefetch from "@astrojs/prefetch";

export default defineConfig({
  site: 'https://baldbeardedbuilder.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: page => 
        page !== 'https://baldbeardedbuilder.com/brain-dump/thanks/' && 
        page !== 'https://baldbeardedbuilder.com/code-of-conduct/thanks/' && 
        page !== 'https://baldbeardedbuilder.com/404/'
    }),
    preact(),
    prefetch({
      throttle: 3,
    })
  ]
});
