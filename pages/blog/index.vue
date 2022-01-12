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
export default {
  asyncData({ $content, params, error, payload }) {
    if (payload) {
      return {
        posts: payload.posts,
        page: 1,
      }
    }
  },
  data() {
    return {
      posts: [],
      enough: false,
      page: 0,
      pageSize: 12,
      isLoading: false,
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
