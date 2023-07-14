const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        neonPink: '#ff00ff',
        grayBorder: 'rgb(255, 255, 255, .15)',
        silverGradient:
          'linear-gradient(to bottom, rgba(133, 133, 133, 100%), rgba(212, 212, 212, 100%))',

        brand: {
          discord: '#7289da',
          facebook: '#3B5998',
          github: '#181717',
          instagram: '#bc2a8d',
          linkedin: '#0077B5',
          patreon: '#FF424D',
          reddit: '#ff4500',
          rss: '#FFA500',
          twitch: '#6441A4',
          twitter: '#1da1f2',
          youtube: '#e52d27',
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, theme }) {
      addUtilities({
        '.text-gradient': {
          background:
            'linear-gradient(rgba(112, 112, 112, 100%), rgba(229,229, 229, 100%))',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      })
    }),
  ],
}
