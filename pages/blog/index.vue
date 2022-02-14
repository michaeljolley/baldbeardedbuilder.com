<template>
  <article>
    <div class="latest-posts">
      <h1>Give me moar <span>Posts</span></h1>
      <ul>
        <li v-for="post in posts" :key="post.slug">
          <BlogCard :post="post" />
        </li>
      </ul>
      <InfiniteScroll :enough="enough" @load-more="loadPosts()" />
    </div>
  </article>
</template>
<script>
import Vue from 'vue'
import generateOgraph from '@/middleware/generateOgraph'
export default {
  asyncData({payload}) {
    let page = 0;
    let posts = []
    if (payload) {
      page = 1;
      posts = payload.posts
    }

    return {
      posts,
      enough: false,
      page,
      pageSize: 12,
      isLoading: false,
    }
  },
  head() {
    const metaTitle = `All Bald Bearded Builder Blog Posts`
    const metaDescription =
      'All blog posts written by Michael Jolley, the bald, bearded, builder.'
    const metaOgraph = generateOgraph('All Bald Bearded Builder Blog Posts')
    const metaUrl = 'https://baldbeardedbuilder.com/blog/'
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
  mounted() {
    if (this.page === 0) {
      this.loadPosts()
    }
  },
  methods: {
    async loadPosts() {
      if (this.posts.length === 0) {
        this.page = 0
      }
      if (!this.enough && !this.isLoading) {
        this.isLoading = true
        const newPosts = await this.$content('blog')
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
          .skip(this.page * this.pageSize)
          .limit(this.pageSize)
          .sortBy('date', 'desc')
          .fetch()
        this.page++
        if (newPosts.length > 0) {
          this.posts.push(...newPosts)
        }
        if (newPosts.length === 0 || newPosts.length < 12) {
          this.enough = true
        }
        this.isLoading = false
      }
      await Vue.nextTick()
    },
  },
}
</script>
<style lang="scss" scoped>
article {
  .latest-posts {
    @apply flex flex-col justify-center items-center;
    @apply mx-auto;
    @apply py-12 px-8;
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply text-base;

    @apply text-darkPurple dark:text-white;

    h1 {
      @apply flex items-center;
      @apply font-cairo font-bold uppercase;
      @apply text-3xl md:text-4xl;
      span {
        @apply flex;
        @apply ml-1;
        @apply py-0 px-2;
        @apply text-white dark:text-darkPurple;
        @apply bg-blue-500 dark:bg-bbbblue;
      }
    }

    ul {
      @apply mt-16;
      @apply grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8;
      @apply list-none;

      li {
        @apply h-full;
      }
    }
  }
}
</style>
