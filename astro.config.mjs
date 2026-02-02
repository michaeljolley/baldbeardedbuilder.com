// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://baldbeardedbuilder.com',
  trailingSlash: 'always',
  devToolbar: {
    enabled: false
  },
  integrations: [
    expressiveCode({
      themes: ['laserwave'],
      styleOverrides: {
        frames: {
          tooltipSuccessBackground: '#9333ea'
        },
        uiFontFamily: 'inherit',
        codeCopyButtonBackground: 'transparent',
        codeCopyButtonBorder: 'none',
        codeCopyButtonBorderColor: 'transparent',
        codeCopyButtonHoverBackground: 'rgba(147, 51, 234, 0.2)',
        codeCopyButtonActiveBackground: 'rgba(147, 51, 234, 0.3)',
        codeCopyButtonHoverOrFocusBackground: 'rgba(147, 51, 234, 0.2)'
      },
      frames: {
        showCopyToClipboardButton: true,
        copyButtonTooltipText: 'Copy this snippet'
      }
    }),
    sitemap()
  ]
});
