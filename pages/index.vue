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
}
</script>
<style lang="scss" scoped></style>
