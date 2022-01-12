<template>
  <transition-expand>
    <div v-if="menuExpanded" class="stripe">
      <NuxtLink
        to="/blog/"
        aria-label="Aggregated content Michael has generated"
        ><span>Blog</span></NuxtLink
      >
      <!-- <NuxtLink
        to="/podcasts/"
        aria-label="Aggregated content Michael has generated"
        ><span>Podcasts</span></NuxtLink
      >
      <NuxtLink
        to="/videos/"
        aria-label="Aggregated content Michael has generated"
        ><span>Videos</span></NuxtLink
      > -->
      <a
        href="https://bbb.dev/shop"
        aria-label="T-shirts, stickers, and other swag"
        ><span>Swag</span></a
      >
    </div>
  </transition-expand>
</template>
<script>
import { mapGetters } from 'vuex'
import TransitionExpand from '../TransitionExpand.vue'

export default {
  components: { TransitionExpand },
  computed: {
    ...mapGetters(['menuExpanded']),
  },
}
</script>
<style lang="scss" scoped>
div {
  @apply list-none;
  @apply justify-evenly gap-6 md:gap-10;

  a {
    @apply flex items-center justify-center;
    @apply border-b-2 border-t-2 border-transparent;
    @apply py-3 px-10;

    @apply font-raleway font-bold;
    @apply text-darkPurple dark:text-gray-100;

    &:first-child {
      @apply mt-6;
    }
    &:last-child {
      @apply mb-6;
    }

    &:hover {
      background: linear-gradient(to right, #ff00ff, #00ffff);
      @apply text-gray-100;

      span {
        opacity: 0.8;
        transform: translate(0, 10%) scale(4.5) rotate(-10deg);
      }
    }

    span {
      opacity: 1;
      transition: opacity 0.5s, color 0.2s, transform 0.5s;
    }
  }
}
</style>
