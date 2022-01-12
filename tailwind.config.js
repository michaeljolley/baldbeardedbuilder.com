
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
        stripeLight: 'rgba(3, 40, 249, 0.07)',
        stripeDark: 'rgba(255, 255, 255, 0.09)',
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
  variants: {
    extend: { typography: ["dark"] }
  },
  plugins: [
  ],
}
