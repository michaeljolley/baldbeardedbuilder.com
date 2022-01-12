<template>
  <section>
    <div class="latest-posts">
      <h2>Latest <span>Posts</span></h2>
      <ul>
        <li v-for="post in posts" :key="post.slug">
          <BlogCard :post="post" />
        </li>
      </ul>
      <NuxtLink class="all" to="/blog/" title="See all posts"
        >See all posts</NuxtLink
      >
    </div>
  </section>
</template>
<script>
export default {
  props: {
    posts: {
      type: Array,
      required: true,
    },
  },
}
</script>
<style lang="scss" scoped>
section {
  .latest-posts {
    @apply flex flex-col justify-center items-center;
    @apply mx-auto;
    @apply py-12 px-8;
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply text-base;

    @apply text-darkPurple dark:text-white;

    h2 {
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
      @apply mt-12;
      @apply grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8;
      @apply list-none;

      li {
        @apply h-full;

        &:not(:nth-child(-n + 2)) {
          @apply hidden;
        }

        @screen sm {
          &:not(:nth-child(-n + 2)) {
            @apply block;
          }
          &:not(:nth-child(-n + 4)) {
            @apply hidden;
            @apply xl:block;
          }
        }
      }
    }

    .all {
      @apply font-bold font-fira uppercase;
      @apply bg-darkPurple dark:bg-gray-200;
      @apply text-white dark:text-darkPurple;
      @apply py-3 px-5;
      @apply mt-12;
      @apply rounded-md;

      &:hover {
        @apply bg-blue-500 dark:bg-bbbpink;
      }
    }
  }
}
</style>
