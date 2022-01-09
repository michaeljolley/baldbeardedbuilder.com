<template>
  <header>
    <section>
      <PageHeaderLogo />
      <PageHeaderNavigation />
      <div class="end">
        <PageHeaderHamburger />
        <PageHeaderModeToggle />
      </div>
    </section>
    <PageHeaderVertNavigation />
  </header>
</template>
<style lang="scss" scoped>
header {
  @apply w-full;
  @apply flex flex-col;

  section {
    @apply flex justify-between;
    @apply my-6 mx-auto;
    @apply px-4;
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;

    @apply text-gray-900 dark:text-white;

    .end {
      @apply flex flex-row items-center;
      @apply justify-end;
    }
  }
}
</style>
