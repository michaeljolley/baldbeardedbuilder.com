<template>
  <section>
    <div class="intro" :class="{ twitch: isOnline }">
      <iframe
        v-if="isOnline"
        :src="video"
        scrolling="no"
        allow="autoplay"
        allowfullscreen="false"
      >
      </iframe>
    </div>
  </section>
</template>
<script>
export default {
  data() {
    return {
      isOnline: false,
      video: `https://player.twitch.tv/?channel=baldbeardedbuilder&parent=baldbeardedbuilder.com&autoplay=true`,
    }
  },
  async created() {
    const response = await fetch(
      `https://baldbeardedbuilder.com/.netlify/functions/twitch`
    )
    const { isOnline } = await response.json()
    this.isOnline = isOnline
  },
}
</script>
<style lang="scss" scoped>
section {
  @apply flex justify-center;
  @apply mx-auto;
  @apply w-full;
  @apply lg:max-w-4xl xl:max-w-6xl;

  @apply text-gray-900 dark:text-white;

  .intro {
    @apply h-96;
    @apply w-5/6;
    @apply bg-contain bg-no-repeat;
    @apply bg-center;
    @apply flex justify-center items-center;

    background-image: url('/images/intro-light.svg');

    &.twitch {
      @apply w-full;
      background-image: unset;

      iframe {
        @apply w-full;
        @apply h-3/4;

        @screen md {
          width: unset;
          aspect-ratio: 16/9;
        }
      }
    }
  }
}
.dark {
  section {
    .intro {
      background-image: url('/images/intro-dark.svg');

      &.twitch {
        background-image: unset;
      }
    }
  }
}
</style>
