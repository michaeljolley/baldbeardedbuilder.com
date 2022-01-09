<template>
  <header>
    <PageHeaderLogo />
    <PageHeaderNavigation />
    <PageHeaderModeToggle />
  </header>
</template>
<style lang="scss" scoped>
header {
  @apply my-6 mx-auto;
  @apply px-4;
  @apply w-full;
  @apply lg:max-w-4xl xl:max-w-6xl;

  @apply flex flex-row justify-between items-center;

  @apply text-gray-900 dark:text-white;
}
</style>
