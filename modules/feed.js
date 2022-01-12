import config from './config'

export default () => {
  const { $content } = require('@nuxt/content')

  const feedFormats = {
    rss: { type: 'rss2', file: 'feed.xml' },
    json: { type: 'json1', file: 'feed.json' },
  }

  const getMainFeeds = () => {
    const createFeedArticles = async function (feed) {
      feed.options = {
        title: `${config.indexTitle} » ${config.baseTitle}`,
        link: `${config.baseUrl}/blog/`,
        description: config.baseDescription,
      }

      const posts = await $content('blog')
        .where({ date: { $lt: Date.now() } })
        .sortBy('date', 'desc')
        .limit(50)
        .fetch()

      posts.forEach((post) => {
        feed.addItem({
          title: post.title,
          id: post.slug,
          date: new Date(post.date),
          link: `${config.baseUrl}/blog/${post.slug}/`,
          description: post.description,
          thumbnail: post.cover ? post.cover.secure_url : '',
        })
      })
    }

    return Object.values(feedFormats).map(({ file, type }) => ({
      path: `${file}`,
      type,
      create: createFeedArticles,
    }))
  }

  const getPrivateFeeds = () => {
    const createPrivateFeedArticles = async function (feed) {
      feed.options = {
        title: `${config.indexTitle} » ${config.baseTitle}`,
        link: `${config.baseUrl}/blog/`,
        description: config.baseDescription,
      }

      const posts = await $content('blog')
        .sortBy('date', 'desc')
        .limit(50)
        .fetch()

      posts.forEach((post) => {
        feed.addItem({
          title: post.title,
          id: post.slug,
          date: new Date(post.updatedAt || post.date),
          link: `${config.baseUrl}/blog/${post.slug}/`,
          description: post.description,
          content: `${post.excerpt} ...`,
        })
      })
    }
    return [
      {
        path: 'feed_private.xml',
        type: 'rss2',
        create: createPrivateFeedArticles,
      },
    ]
  }

  return [...getMainFeeds(), ...getPrivateFeeds()]
}
