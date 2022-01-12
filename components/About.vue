<template>
  <section class="stripe">
    <div class="about">
      <img :src="michaelImage" @click.prevent="recycle()" />
      <div>
        <h2>About <span>Michael</span></h2>
        <p>
          At work, he leads the Developer Relations team at
          <a href="https://deepgram.com">Deepgram</a> where he gets to play with
          awesome APIs. You can also catch him giving talks at various events,
          sharing videos on
          <a href="https://youtube.com/baldbeardedbuilder">YouTube</a>, or
          streaming on
          <a href="https://twitch.tv/baldbeardedbuilder">Twitch</a>.
        </p>
        <p>
          But more importantly,<span>{{ positiveMessage }}</span>
        </p>
      </div>
    </div>
  </section>
</template>
<script>
const positiveMessages = [
  'he believes in you.',
  "he thinks you're awesome.",
  'he thinks you belong here.',
  'he knows you belong here.',
  "he thinks you've got this.",
  'he knows you can.',
]
export default {
  data() {
    return {
      michaelImage: '',
      positiveMessage: '',
    }
  },
  mounted() {
    this.recycle()
  },
  methods: {
    recycle() {
      this.positiveMessage =
        positiveMessages[Math.floor(Math.random() * positiveMessages.length)]
      const images = [5, 6, 7, 8, 10]
      const mastNumber = Math.floor(Math.random() * images.length)
      this.michaelImage = `https://res.cloudinary.com/dk3rdh3yo/image/upload/g_auto,f_auto/v1607302424/ograph_${images[mastNumber]}.png`
    },
  },
}
</script>
<style lang="scss" scoped>
section {
  .about {
    @apply flex justify-evenly items-center;
    @apply mx-auto;
    @apply p-8 pb-0;
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply text-base;

    @apply text-darkPurple dark:text-white;

    img {
      @apply hidden md:block;
      @apply -mt-32;
      height: min-content;
      width: 24em;
      @apply cursor-pointer;
    }

    div {
      @apply w-full md:w-1/2;
      @apply pb-8 md:pb-0 md:pl-6;

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
      p {
        @apply py-3;

        a {
          @apply text-blue-500 dark:text-bbbpink;
          @apply border-b-2 border-transparent;
          &:hover {
            border-image-slice: 1;
            border-image-source: linear-gradient(to right, #ff00ff, #00ffff);
          }
        }

        span {
          @apply ml-1;
          @apply pt-0 pb-1 px-2;
          @apply font-bold;
          @apply text-white;
          @apply bg-blue-500 dark:bg-bbbpink;
        }
      }
    }
  }
}
</style>
