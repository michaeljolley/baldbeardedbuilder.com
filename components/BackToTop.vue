<template>
  <div
    class="backToTop"
    :class="{ 'opacity-100': showButton, 'opacity-0': !showButton }"
  >
    <a title="back to top" aria-label="back to top" @click="top">
      <IconArrowUp />
    </a>
  </div>
</template>
<script>
export default {
  data() {
    return {
      showButton: false,
    }
  },
  beforeMount() {
    window.addEventListener('scroll', this.handleScroll)
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    handleScroll() {
      if (window.pageYOffset === 0) {
        window.location.hash = ''
      }

      if (window.pageYOffset > 200) {
        this.showButton = true
      } else {
        this.showButton = false
      }
    },
    top: (event) => {
      window.scroll({ top: 0, left: 0, behavior: 'smooth' })
    },
  },
}
</script>
<style scoped>
.backToTop {
  @apply text-5xl;
  @apply fixed;
  @apply inset-x-auto;
  @apply bottom-0;
  @apply right-0;
  @apply z-30;
  @apply mb-6;
  @apply mr-6;
  @apply md:mb-12;
  @apply md:mr-12;
  @apply transition-opacity;
  @apply duration-500;
  @apply ease-in-out;
  @apply cursor-pointer;
  @apply text-darkPurple dark:text-gray-100;
}
a:hover {
  @apply text-blue-500 dark:text-bbbpink;
}
</style>
