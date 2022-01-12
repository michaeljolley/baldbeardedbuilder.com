<template>
  <div class="blog-topper">
    <h1>{{ post.title }}</h1>
    <summary>
      <div>
        <ul>
          <li>
            <IconCalendar />
          </li>
          <li>
            Published On<br />
            <time>{{ post.date | formatDate }}</time>
          </li>
        </ul>
        <ul>
          <li>
            <IconClock />
          </li>
          <li>{{ post.readingTime.text }}</li>
        </ul>
      </div>
      <div>
        <SocialSharing :post="post" />
      </div>
    </summary>
  </div>
</template>
<script>
export default {
  props: {
    post: {
      type: Object,
      required: true,
    },
  },
}
</script>
<style lang="scss" scoped>
.blog-topper {
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

  summary {
    @apply border-l-2 border-gray-500 dark:border-gray-400;
    @apply bg-gray-50 dark:bg-stripeDark;
    @apply p-2 px-4;
    @apply list-none;
    @apply flex flex-row justify-between;

    div {
      @apply flex flex-col gap-3 justify-center;

      ul {
        @apply flex flex-row gap-2 items-center;
        @apply list-none;
        @apply text-sm;
        @apply m-0;
        @apply bg-transparent;

        li {
          @apply block;
          @apply justify-center;
          @apply p-0;
          @apply border-0;
          @apply text-darkPurple dark:text-gray-100;

          time {
            @apply text-blue-500 dark:text-bbbblue;
          }
          &:not(:last-child) {
            @apply border-0;
          }
          &:last-child {
            @apply pl-1;
          }

          &:before {
            @apply hidden;
            @apply p-0;
            @apply m-0;
            background-image: unset;
          }
        }
      }
    }
  }
}
</style>
