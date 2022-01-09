<template>
  <footer class="stripe">
    <section>
      <div>
        <img src="/images/logo-horiz.svg" class="logo" />
      </div>
      <nav>
        <ul>
          <li>
            <NuxtLink to="/code-of-conduct/" title="Code of Conduct"
              >Code of Conduct</NuxtLink
            >
          </li>
          <li>
            <NuxtLink to="/uses/" title="My gear & setup"
              ><IconVideoCamera class="text-blue-500" /> What I'm
              Using</NuxtLink
            >
          </li>
          <li>
            <a
              href="https://bbb.dev/patreon"
              title="Crafted with love on GitHub"
              >Become a Patron</a
            >
          </li>
          <li>
            <a
              href="https://github.com/michaeljolley/michaeljolley.com"
              title="Crafted with love on GitHub"
              >Crafted with <IconHeart class="text-red-500"
            /></a>
          </li>
        </ul>
      </nav>
    </section>
  </footer>
</template>
<style lang="scss" scoped>
footer {
  @apply px-8 py-8;
  @apply flex flex-row;
  @apply sm:gap-16;
  @apply md:px-16 md:py-12;
  @apply font-raleway;

  section {
    @apply mx-auto;
    @apply w-full h-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply flex flex-row items-center gap-20;
    flex: 0 1 auto;

    .logo {
      @apply hidden;
      @apply self-start;
      @apply sm:flex;
      @apply sm:w-64;
      @apply text-darkPurple dark:text-gray-100;
    }

    nav {
      @apply flex gap-8 justify-between flex-row flex-wrap;
      @apply md:gap-20 md:justify-start;
      ul {
        @apply flex flex-col;

        li {
          @apply pb-2;
          @apply uppercase;
          a {
            @apply flex items-center;
            @apply text-darkPurple dark:text-gray-100;
            @apply font-normal;
            &:hover {
              @apply text-blue-500;
            }
            .svg-icon {
              @apply mx-2;
            }
          }
        }
      }
    }
  }
}
</style>
