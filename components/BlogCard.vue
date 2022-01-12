<template>
  <NuxtLink :to="`/blog/${post.slug}/`" :title="post.title">
    <v-image
      v-if="post.cover || post.cover_image"
      :alt="post.banner_image_alt || post.title"
      :src="post.cover_image || post.cover.public_id"
    />
    <main>
      <h3>{{ post.title }}</h3>
      <p>
        This past year I've been examining the communities I'm a part of. It
        didn't take long to notice that I was living in a bubble of people who
        look, act, and think like me. It was one of those unconscious things,
        that when recognized, seems obvious and repulsive.
      </p>
    </main>
    <footer>READ MORE <IconArrow /></footer>
  </NuxtLink>
</template>
<script>
export default {
  props: {
    post: {
      type: Object,
      required: true,
    },
  },
}
</script>
<style lang="scss" scoped>
a {
  @apply flex flex-col overflow-hidden;
  @apply h-full;
  @apply rounded-md;
  @apply border-b-4 border-transparent;
  @apply bg-white dark:bg-darkPurple;

  img {
    @apply rounded-t-md;
    padding: 1px;
  }

  main {
    @apply flex flex-col gap-3;
    @apply p-5;

    h3 {
      @apply text-xl font-bold;
    }

    p {
      @apply text-sm font-raleway;
      @apply text-gray-500;
    }
  }
  footer {
    @apply opacity-0;
    @apply uppercase;
    @apply text-bbbpink font-bold;
    @apply p-5 mt-auto;
    @apply flex align-middle gap-1;
  }

  &:hover {
    border-image-slice: 1;
    border-image-source: linear-gradient(to right, #ff00ff, #00ffff);
    @apply rounded-md;

    @apply shadow-2xl;

    main {
      h3 {
        background: linear-gradient(
          90deg,
          rgba(255, 0, 255, 1) 0%,
          rgba(0, 255, 255, 1) 100%
        );
        -webkit-text-fill-color: transparent;
        @apply bg-clip-text;
      }
    }
    footer {
      @apply opacity-100;
    }
  }
}
.dark {
  a:hover {
    box-shadow: 0 25px 50px -12px rgba(255, 255, 255, 0.09);
  }
}
</style>
