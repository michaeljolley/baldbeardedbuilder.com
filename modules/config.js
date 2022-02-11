require('dotenv').config()

const generateOgraph = require('../middleware/generateOgraph').default

const config = {
  builtAt: new Date().toISOString(),
  baseUrl: 'https://baldbeardedbuilder.com',
  indexTitle: 'Building Better Builders',
  baseBrand: 'Bald. Bearded. Builder.',
  baseTitle: 'Bald. Bearded. Builder.',
  baseSplitter: ' » ',
  baseDescription:
    'Home of the Bald. Bearded. Builder. community. Working to build better builders.',
  baseKeywords: [
    'developer',
    'javascript',
    'csharp',
    'azure',
    'michael jolley',
    'education',
    'programming',
  ],
  postsPerPage: 12,
  repoUrl:
    process.env.REPOSITORY_URL ||
    'https://github.com/michaeljolley/baldbeardedbuilder.com',
  repoBranch: process.env.HEAD || process.env.GIT_BRANCH || 'main',
  nodeEnv: process.env.NODE_ENV || 'development',
  netlifyContext: process.env.CONTEXT || null,
  googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || null,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  cloudinaryAPIKey: process.env.CLOUDINARY_API_KEY || null,
  cloudinaryAPISecret: process.env.CLOUDINARY_API_SECRET || null,
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || null,
  functionsUrl: process.env.FUNCTION_URL || null,
  get headMeta() {
    return [
      { charset: 'utf-8' },
      {
        hid: 'keywords',
        name: 'keywords',
        content: this.baseKeywords.join(','),
      },
      {
        hid: 'description',
        name: 'description',
        content: this.baseDescription,
      },
      {
        name: 'viewport',
        content: 'width=device-width,initial-scale=1,viewport-fit=cover',
      },
      { name: 'msapplication-TileColor', content: '#ffffff' },
      {
        name: 'msapplication-TileImage',
        content: '/mstile-150x150.png',
      },
      { name: 'theme-color', content: '#ffffff' },
      { name: 'robots', content: 'index, follow' },
      {
        hid: 'twitter:card',
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      { hid: 'twitter:site', name: 'twitter:site', content: '@baldbeardbuild' },
      { hid: 'twitter:url', name: 'twitter:url', content: this.baseUrl },
      {
        hid: 'twitter:title',
        name: 'twitter:title',
        content: `${this.indexTitle}${this.baseSplitter}${this.baseTitle}`,
      },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content: this.baseDescription,
      },
      {
        hid: 'twitter:image',
        name: 'twitter:image',
        content: generateOgraph('Building Better Builders\nwith Michael Jolley'),
      },
      {
        hid: 'twitter:image:width',
        name: 'twitter:image:width',
        content: '1200',
      },
      {
        hid: 'twitter:image:height',
        name: 'twitter:image:height',
        content: '600',
      },
      {
        hid: 'twitter:image:alt',
        name: 'twitter:image:alt',
        content: `${this.indexTitle}${this.baseSplitter}${this.baseTitle}`,
      },
      { hid: 'og:url', property: 'og:url', content: this.baseUrl },
      {
        hid: 'og:title',
        property: 'og:title',
        content: `${this.indexTitle}${this.baseSplitter}${this.baseTitle}`,
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: this.baseDescription,
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: generateOgraph('Building Better Builders\nwith Michael Jolley'),
      },
      {
        hid: 'og:image:width',
        name: 'og:image:width',
        content: '1200',
      },
      {
        hid: 'og:image:height',
        name: 'og:image:height',
        content: '600',
      },
      {
        hid: 'og:image:alt',
        name: 'og:image:alt',
        content: `${this.indexTitle}${this.baseSplitter}${this.baseTitle}`,
      },
      {
        hid: 'og:updated_time',
        property: 'og:updated_time',
        content: this.builtAt,
      },
      {
        hid: 'og:site_name',
        property: 'og:site_name',
        content: `${this.indexTitle}${this.baseSplitter}${this.baseBrand}`,
      },
      { hid: 'og:type', property: 'og:type', content: 'website' },
      {
        name: 'monetization',
        content: `${this.monetizationPointer}`,
      },
    ]
  },
  get headLinks() {
    return [
      {
        rel: 'alternative',
        type: 'application/rss+xml',
        href: '/feed.xml',
        title: 'RSS',
      },
      {
        rel: 'dns-prefetch',
        href: '//res.cloudinary.com',
      },
      {
        rel: 'preconnect',
        href: 'https://res.cloudinary.com',
      },
      {
        rel: 'prerender',
        href: `${this.baseUrl}/blog`,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon-16x16.png',
        sizes: '16x16',
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon-32x32.png',
        sizes: '32x32',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
        sizes: '180x180',
      },
      {
        rel: 'manifest',
        href: '/site.webmanifest',
      },
    ]
  },
}

export default config
