import readingTime from 'reading-time'
import { $cloudinary, $youtube } from './middleware'
import {
  cloudinary,
  config,
  feed,
  googleAnalytics,
  sanity,
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
    $youtube,
  ],

  modules: [
    '@nuxtjs/cloudinary',
    '@nuxt/content',
    '@nuxtjs/feed',
    '@nuxtjs/sitemap',
    'vue-social-sharing/nuxt',
    '@nuxtjs/proxy',
  ],

  content: {
    liveEdit: false,
    markdown: {
      prism: {
        theme: 'prism-themes/themes/prism-material-dark.css',
      },
    },
  },

  cloudinary,
  feed,
  googleAnalytics,
  sanity,
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

  build: {},

  generate: {
    crawler: isProduction(),
    fallback: true,
  },

  hooks: {
    'content:file:beforeInsert': async (document, database) => {
      const directories = document.dir.split('/').filter((f) => f.length > 0)
      const slug = directories[directories.length - 1]

      if (directories.includes('blog')) {

        // Copy images to assets directory for optimization
        // and update the img tags with the new paths
        await $cloudinary.copyAssets(document, slug, __dirname)

        // for blog posts, update the slug to be based off the
        // last directory in the path
        document.slug = slug
        document.path = `/blog/${slug}`
        document.dir = `/blog`

        // calculate and add reading time to document
        if (document.text) {
          document.readingTime = readingTime(document.text)
        }
      }
    },
  }
}
