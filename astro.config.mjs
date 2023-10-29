import { defineConfig } from 'astro/config';
import preact from "@astrojs/preact";
import prefetch from "@astrojs/prefetch";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://baldbeardedbuilder.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [preact(), prefetch({
    throttle: 3
  }), tailwind()]
});