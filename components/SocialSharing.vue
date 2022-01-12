<template>
  <section>
    <h3>Sharing is Caring</h3>
    <ul>
      <li>
        <ShareNetwork
          network="Facebook"
          :url="`${baseUrl}${post.path}/`"
          :title="post.title"
          :description="post.description"
          :quote="post.description"
          :hashtags="post.tags && post.tags.join(',')"
          class="facebook"
        >
          <IconBrandFacebook />
        </ShareNetwork>
      </li>
      <li>
        <ShareNetwork
          network="Twitter"
          :url="`${baseUrl}${post.path}/`"
          :title="post.title"
          twitter-user="baldbeardbuild"
          :hashtags="post.tags && post.tags.join(',')"
          class="twitter"
        >
          <IconBrandTwitter />
        </ShareNetwork>
      </li>
      <li>
        <ShareNetwork
          network="LinkedIn"
          :title="post.title"
          :url="`${baseUrl}${post.path}/`"
          class="linkedin"
        >
          <IconBrandLinkedIn />
        </ShareNetwork>
      </li>
      <li>
        <ShareNetwork
          network="Reddit"
          :url="`${baseUrl}${post.path}/`"
          :title="post.title"
          class="reddit"
        >
          <IconBrandReddit />
        </ShareNetwork>
      </li>
    </ul>
  </section>
</template>

<script>
export default {
  props: {
    post: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      baseUrl: process.env.baseUrl.startsWith('http://localhost')
        ? 'https://baldbeardedbuilder.com'
        : process.env.baseUrl,
    }
  },
}
</script>

<style lang="scss" scoped>
section {
  @apply m-0;
  @apply lg:flex;
  @apply flex-col;

  h3 {
    @apply bg-transparent dark:bg-transparent;
    @apply text-base;
    text-transform: none;
    @apply p-0 m-0;
    @apply font-raleway font-bold;
    @apply text-darkPurple dark:text-white;
  }

  ul {
    @apply flex flex-row justify-between items-start;
    @apply text-2xl;
    @apply m-0 mt-2;
    @apply list-none;
    @apply bg-transparent;

    li {
      @apply p-0;
      @apply border-0;
      @apply bg-transparent;

      &:before {
        @apply hidden;
        @apply p-0;
        @apply m-0;
        background-image: unset;
      }
      &:not(:last-child) {
        @apply border-0;
      }

      a {
        @apply cursor-pointer;
        @apply bg-transparent;

        @apply flex;
        @apply justify-center;
        @apply items-center;
        @apply rounded-2xl;
        @apply text-black dark:text-gray-100;

        &:hover {
          @apply text-blue-500 dark:text-bbbpink;
        }
      }
    }
  }
}
.dark {
  section {
    ul {
      @apply bg-transparent;
      li {
        a {
          @apply text-gray-100;

          &:hover {
            @apply text-bbbpink;
          }
        }
      }
    }
  }
}
</style>
