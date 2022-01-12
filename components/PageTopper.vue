<template>
  <div class="page-topper">
    <h1>{{ title }}</h1>
  </div>
</template>
<script>
export default {
  props: {
    title: {
      type: String,
      required: true,
    },
  },
}
</script>
<style lang="scss" scoped>
.page-topper {
  @apply pb-5;

  h1 {
    @apply font-raleway font-bold text-3xl md:text-4xl;
    @apply mb-4;

    background: linear-gradient(
      90deg,
      rgba(255, 0, 255, 1) 0%,
      rgba(0, 255, 255, 1) 100%
    );
    -webkit-text-fill-color: transparent;
    @apply bg-clip-text;
  }
}
</style>
