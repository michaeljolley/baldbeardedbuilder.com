import config from './config'

const generateSitemapRoute = (obj) => {
  return {
    url: `${obj.path}/`,
    priority: 0.8,
    lastmod: obj.updatedAt,
  }
}

export default {
  path: '/sitemap.xml',
  hostname: config.baseUrl,
  gzip: true,
  trailingSlash: true,
  routes: async () => {
    const { $content } = require('@nuxt/content')

    const posts = (await $content('blog').fetch()).map((p) =>
      generateSitemapRoute(p)
    )

    return [].concat(...posts)
  },
}
