<template>
  <article>
    <header>
      <cld-image
        alt="Hands of various people joined"
        public-id="cover_knfirw"
        title="Hands of various people joined"
        quality="auto"
        fetch-format="auto"
        responsive
        blur
        ><cld-placeholder type="blur"
      /></cld-image>
    </header>
    <main>
      <aside></aside>
      <section class="content">
        <PageTopper title="Code of Conduct Report" />
        <div>
          <p>
            Thank you for submitting that breach of our code of conduct. We take
            breaches of our Code of Conduct <strong>very</strong> seriously. You
            can trust that we will address the issue you raised and if you
            provided your contact information, we will update you accordingly.
          </p>
        </div>
      </section>
    </main>
  </article>
</template>
<script>
export default {}
</script>
<style lang="scss" scoped>
article {
  header {
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply mx-auto;
    @apply rounded-md;
    @apply mb-8;
  }

  main {
    @apply flex flex-row lg:gap-8;
    @apply mb-12;
    @apply px-5 sm:px-3 md:px-0;

    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply md:mx-auto;
    @apply items-start;

    aside {
      @apply flex-col;
      @apply w-1/12;
      @apply z-0;
      @apply sticky;
      top: 105px;
      @apply flex;
      @apply lg:w-1/5;

      @apply text-darkPurple dark:text-gray-100;
    }
  }
}
</style>
