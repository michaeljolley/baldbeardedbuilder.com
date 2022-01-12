<template>
  <section class="stripe">
    <div class="social-bar">
      <h2>Let's Get <span>Connected</span></h2>
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
    </div>
  </section>
</template>
<style lang="scss" scoped>
section {
  .social-bar {
    @apply flex flex-col justify-center items-center;
    @apply mx-auto;
    @apply py-12 px-8;
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply text-base;

    @apply text-darkPurple dark:text-white;

    h2 {
      @apply flex items-center;
      @apply font-cairo font-bold uppercase;
      @apply text-3xl md:text-4xl;
      span {
        @apply flex;
        @apply ml-1;
        @apply py-0 px-2;
        @apply text-white dark:text-darkPurple;
        @apply bg-blue-500 dark:bg-bbbblue;
      }
    }

    ul {
      @apply grid grid-cols-3 w-full gap-8;
      @apply md:flex md:w-5/6 md:justify-evenly;
      @apply mt-12;
      @apply text-6xl;

      li {
        @apply flex justify-center;
      }

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
</style>
