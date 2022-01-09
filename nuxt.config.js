import {
  config,
  feed,
  googleAnalytics,
  sitemap,
} from './modules'

const isProduction = () => {
  return process.env.CONTEXT && process.env.CONTEXT === 'production'
}

const isPreviewBuild = () => {
  return process.env.PULL_REQUEST
}


export default {
  target: 'static',

  env: {
    nodeEnv: config.nodeEnv,
    netlifyContext: config.netlifyContext,
    netlifyHead: config.repoBranch,
    isPreviewBuild: isPreviewBuild(),
    signer: config.signer,
    baseUrl: config.baseUrl,
    repoUrl: config.repoUrl,
    repoBranch: config.repoBranch,
  },

  router: {
    trailingSlash: true,
  },

  head: {
    htmlAttrs: {
      lang: 'en',
    },
    title: config.indexTitle,
    titleTemplate: `%s${config.baseSplitter}${config.baseTitle}`,
    meta: config.headMeta,
    link: config.headLinks,
  },

  css: [
  ],

  components: true,

  buildModules: [
    '@nuxtjs/dotenv',
    '@nuxtjs/eslint-module',
    '@nuxtjs/google-analytics',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/sanity/module'
  ],

  modules: [
    '@nuxtjs/feed',
    '@nuxtjs/sitemap',
    'vue-social-sharing/nuxt',
    '@nuxtjs/proxy',
  ],

  feed,
  googleAnalytics,
  sitemap,

  tailwindcss: {
    exposeConfig: true,
    cssPath: '~/assets/scss/main.scss',
  },

  purgeCSS: {},

  proxy: {
    '/api': `${config.functionsUrl}/.netlify/functions`,
  },

  plugins: ['~/plugins/scroll.client.js', '~/plugins/formatDate.js'],

  build: {
  }
}
