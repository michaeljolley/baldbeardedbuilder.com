<template>
  <footer class="stripe">
    <section>
      <div class="logo">
        <LogoHoriz />
      </div>
      <nav>
        <ul>
          <li>
            <NuxtLink to="/code-of-conduct/" title="Code of Conduct"
              >Code of Conduct</NuxtLink
            >
          </li>
          <li>
            <NuxtLink class="uses" to="/uses/" title="My gear & setup"
              >What I'm Using <IconVideoCamera
            /></NuxtLink>
          </li>
          <li>
            <a
              class="patreon"
              href="https://bbb.dev/patreon"
              title="Support BBB via Patreon"
              >Become a Patron <IconBrandPatreon
            /></a>
          </li>
          <li>
            <a
              class="github"
              href="https://github.com/michaeljolley/baldbeardedbuilder.com"
              title="Crafted with love on GitHub"
              >Crafted with <IconHeart
            /></a>
          </li>
          <li class="socials">
            <ul>
              <li>
                <a
                  href="https://twitter.com/baldbeardbuild"
                  rel="noreferrer"
                  target="_blank"
                  class="twitter"
                  title="Follow the musings on Twitter"
                >
                  <IconBrandTwitter
                /></a>
              </li>
              <li>
                <a
                  href="https://twitch.tv/baldbeardedbuilder"
                  rel="noreferrer"
                  target="_blank"
                  class="twitch"
                  title="Check out the live streams on Twitch"
                >
                  <IconBrandTwitch
                /></a>
              </li>
              <li>
                <a
                  href="https://youtube.com/baldbeardedbuilder"
                  rel="noreferrer"
                  target="_blank"
                  class="youtube"
                  title="Subscribe, like & comment on YouTube videos"
                >
                  <IconBrandYouTube
                /></a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/baldbeardedbuilder/"
                  rel="noreferrer"
                  target="_blank"
                  class="instagram"
                  title="Follow the fun on Instagram"
                >
                  <IconBrandInstagram />
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/michaelwjolley/"
                  rel="noreferrer"
                  target="_blank"
                  class="linkedin"
                  title="Get professional on LinkedIn"
                >
                  <IconBrandLinkedIn
                /></a>
              </li>
              <li>
                <a
                  href="https://discord.gg/XSG7HJm"
                  rel="noreferrer"
                  target="_blank"
                  class="discord"
                  title="Join the Discord community"
                >
                  <IconBrandDiscord
                /></a>
              </li>
            </ul>
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
  @apply md:px-16 md:pt-12;
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
      @apply text-4xl;
      @apply text-darkPurple dark:text-gray-100;
    }

    nav {
      @apply flex gap-8 justify-between flex-row flex-wrap;
      @apply md:gap-20 md:justify-start;
      > ul {
        @apply flex flex-col gap-4;

        li {
          @apply uppercase;
          a {
            @apply flex items-center;
            @apply text-blue-500 dark:text-bbbpink;
            @apply font-normal;
            &:hover {
              @apply text-darkPurple dark:text-gray-100;
            }

            &.github:hover {
              span {
                @apply text-red-500;
              }
            }
            &.uses:hover {
              span {
                @apply text-purple-500;
              }
            }

            &.patreon:hover {
              span {
                @apply text-brand-patreon;
              }
            }

            .svg-icon {
              @apply mx-2;
            }
          }

          &.socials {
            @apply pt-8;

            ul {
              @apply flex gap-3;
              @apply text-lg;

              .twitter:hover {
                @apply text-brand-twitter;
              }
              .linkedin:hover {
                @apply text-brand-linkedin;
              }
              .instagram:hover {
                @apply text-brand-instagram;
              }
              .youtube:hover {
                @apply text-brand-youtube;
              }
              .discord:hover {
                @apply text-brand-discord;
              }
              .twitch:hover {
                @apply text-brand-twitch;
              }
            }
          }
        }
      }
    }
  }
}
</style>
