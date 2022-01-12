<template>
  <section v-if="relatedPosts.length > 0" class="stripe">
    <div class="related">
      <h3>Related <span>Posts</span></h3>
      <ul>
        <li v-for="(post, i) of relatedPosts" :key="i">
          <BlogCard :post="post" />
        </li>
      </ul>
    </div>
  </section>
</template>
<script>
export default {
  props: {
    tags: {
      type: Array,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      relatedPosts: {},
    }
  },
  async fetch() {
    try {
      this.relatedPosts = await this.$content(`blog`, { deep: true })
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
        .where({
          $and: [
            { slug: { $ne: this.slug } },
            { tags: { $containsAny: this.tags } },
            { date: { $lt: Date.now() } },
          ],
        })
        .sortBy('published_at', 'desc')
        .limit(3)
        .fetch()
      if (this.relatedPosts.length < 3) {
        const morePosts = await this.$content(`blog`, { deep: true })
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
          .where({
            $and: [
              {
                slug: {
                  $nin: [this.slug, ...this.relatedPosts.map((t) => t.slug)],
                },
              },
              { category: { $in: this.tags.flat() } },
              { date: { $lt: Date.now() } },
            ],
          })
          .sortBy('published_at', 'desc')
          .limit(3 - this.relatedPosts.length)
          .fetch()
        this.relatedPosts = this.relatedPosts.concat(morePosts)
      }
    } catch (error) {}
  },
}
</script>
<style lang="scss" scoped>
section {
  div {
    @apply flex flex-col justify-center items-center;
    @apply mx-auto;
    @apply py-12 px-8;
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;

    h3 {
      @apply flex items-center;
      @apply font-cairo font-bold uppercase;
      @apply text-3xl md:text-4xl;
      @apply text-darkPurple dark:text-white;
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

        &:not(:nth-child(-n + 2)) {
          @apply hidden;
        }

        @screen xl {
          &:not(:nth-child(-n + 2)) {
            @apply block;
          }
        }
      }
    }
  }
}
</style>
