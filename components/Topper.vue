<template>
  <section>
    <div class="intro"></div>
  </section>
</template>
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

    background-image: url('/images/intro-light.svg');
  }
}
.dark {
  section {
    .intro {
      background-image: url('/images/intro-dark.svg');
    }
  }
}
</style>
