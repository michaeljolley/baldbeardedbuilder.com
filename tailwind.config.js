
module.exports = {
  mode: "jit",
  purge: [
    './components/**/*.{vue,js}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        fira: ['Fira Code', 'sans-serif'],
        raleway: ['Raleway', 'sans-serif'],
      },
      colors: {
        darkPurple: '#14051C',
        bbbblue: '#00FFFF',
        bbbpink: '#FF00FF',
        brand: {
          discord: '#7289da',
          facebook: '#3B5998',
          github: '#181717',
          instagram: '#bc2a8d',
          linkedin: '#0077B5',
          reddit: '#ff4500',
          rss: '#FFA500',
          twitch: '#6441A4',
          twitter: '#1da1f2',
          youtube: '#e52d27',
        },
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}
