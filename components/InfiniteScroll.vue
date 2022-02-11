<template>
  <div v-show="!enough" :id="id">
    <slot>
      <IconRefresh />
    </slot>
  </div>
</template>

<script>
export default {
  props: {
    id: {
      default: 'load-more',
      type: String,
    },
    offset: {
      default: 0,
      type: Number,
    },
    enough: {
      default: false,
      type: Boolean,
    },
  },
  beforeMount() {
    window.addEventListener('scroll', this.handleScroll)
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    handleScroll() {
      if (this.enough) return

      const elementToTop = this.getElementOffset().top
      const currentDistance =
        document.documentElement.scrollTop + window.innerHeight
      currentDistance + this.offset > elementToTop && this.$emit('load-more')
    },
    getElementOffset() {
      let top = 0
      let left = 0
      let element = document.getElementById(this.id)

      // Loop through the DOM tree
      // and add it's parent's offset to get page offset
      do {
        top += element.offsetTop || 0
        left += element.offsetLeft || 0
        element = element.offsetParent
      } while (element)

      return {
        top,
        left,
      }
    },
  },
}
</script>
<style scoped>
div {
  @apply w-full;
  @apply text-5xl;
  @apply flex;
  @apply justify-center;
}
</style>
