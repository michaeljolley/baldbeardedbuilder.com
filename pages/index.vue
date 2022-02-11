<template>
  <div>
    <Topper />
    <About />
    <LatestPosts :posts="posts" />
    <SocialBar />
    <LatestVideos :videos="videos" />
  </div>
</template>
<script>
import generateOgraph from '@/middleware/generateOgraph'
export default {
  async asyncData({ $content, payload }) {
    const posts = await $content('blog')
      .only([
        'path',
        'title',
        'cover',
        'date',
        'banner_image_alt',
        'readingTime',
        'summary',
        'slug',
        'dir',
      ])
      .where((obj) => new Date(obj.date) < Date.now())
      .limit(6)
      .sortBy('date', 'desc')
      .fetch()
    const videos = await $content('videos')
      .only(['slug', 'title', 'date', 'link', 'thumbnail'])
      .where({ date: { $lt: Date.now() } })
      .sortBy('date', 'desc')
      .limit(3)
      .fetch()

    return { posts, videos }
  },
  head() {
    const metaTitle = `Building Better Builders`
    const metaDescription =
      'Teaching and encouraging developers with blog posts, YouTube videos, Twitch streams, and more.'
    const metaOgraph = generateOgraph('Building Better Builders', [
      'community',
      'learning',
      'dad-jokes',
    ])
    const metaUrl = 'https://baldbeardedbuilder.com/'
    const meta = [
      { hid: 'og:url', property: 'og:url', content: metaUrl },
      { hid: 'twitter:url', name: 'twitter:url', content: metaUrl },
      {
        hid: 'twitter:title',
        name: 'twitter:title',
        content: metaTitle,
      },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content: metaDescription,
      },
      {
        hid: 'twitter:image',
        name: 'twitter:image',
        content: metaOgraph,
      },
      {
        hid: 'twitter:image:alt',
        name: 'twitter:image:alt',
        content: metaTitle,
      },
      {
        hid: 'og:title',
        property: 'og:title',
        content: metaTitle,
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: metaDescription,
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: metaOgraph,
      },
      {
        hid: 'og:image:alt',
        name: 'og:image:alt',
        content: metaTitle,
      },
    ]
    return {
      title: metaTitle,
      meta,
    }
  },
}
</script>
<style lang="scss" scoped></style>
