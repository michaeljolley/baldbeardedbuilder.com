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
        <PageTopper title="Report Code of Conduct Breach" />
        <div>
          <p>
            We take breaches of our COC very seriously. If you have experienced
            or witnessed a breach by a memmber of our community, we're here for
            you.
          </p>

          <p>
            Please submit the form below with a description of the event(s).
            This information is confidential and is sent directly to Michael &
            our Community Manager to review as quickly as possible.
          </p>

          <form
            name="coc-report"
            method="post"
            action="/success/"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            @submit.prevent="handleSubmit"
          >
            <input type="hidden" name="form-name" value="coc-report" />
            <p hidden>
              <label> Don’t fill this out: <input name="bot-field" /> </label>
            </p>

            <p>
              <label for="description"
                >Description of Event(s)<span class="required"
                  >* required</span
                ></label
              >
              <textarea
                id="description"
                v-model="formData.description"
                rows="6"
                name="description"
                required
                placeholder="Describe the event(s) that occurred. Be sure to include the name of the person who violated the code of conduct."
              ></textarea>
            </p>
            <p>
              If you would like someone to follow up with you, please complete
              the fields below.
              <strong>For your privacy, they are NOT required.</strong>
            </p>
            <p>
              <label for="name">Your Name</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                name="name"
                placeholder="Enter your name here"
              />
            </p>
            <p>
              <label for="email">Your Email</label>
              <input
                id="email"
                v-model="formData.email"
                type="text"
                name="email"
                placeholder="Enter your email address here"
              />
            </p>
            <p>
              <button type="submit">Submit</button>
            </p>
          </form>
        </div>
      </section>
    </main>
    <footer>
      <RelatedPosts :tags="tags" slug="uses" />
    </footer>
  </article>
</template>
<script>
import generateOgraph from '@/middleware/generateOgraph'
export default {
  data() {
    return {
      formData: {},
    }
  },
  head() {
    const metaTitle = `Report Code of Conduct Violations`
    const metaDescription =
      'Report a violation of our community code of conduct'
    const metaOgraph = generateOgraph('Report Code of Conduct Violations')
    const metaUrl = 'https://baldbeardedbuilder.com/report/'
    const meta = [
      { hid: 'og:url', property: 'og:url', content: metaUrl },
      { hid: 'twitter:url', name: 'twitter:url', content: metaUrl },
      {
        hid: 'twitter:title',
        name: 'twitter:title',
        content: metaTitle,
      },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content: metaDescription,
      },
      {
        hid: 'twitter:image',
        name: 'twitter:image',
        content: metaOgraph,
      },
      {
        hid: 'twitter:image:alt',
        name: 'twitter:image:alt',
        content: metaTitle,
      },
      {
        hid: 'og:title',
        property: 'og:title',
        content: metaTitle,
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: metaDescription,
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: metaOgraph,
      },
      {
        hid: 'og:image:alt',
        name: 'og:image:alt',
        content: metaTitle,
      },
    ]
    return {
      title: metaTitle,
      meta,
    }
  },
  methods: {
    encode(data) {
      return Object.keys(data)
        .map(
          (key) => encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
        )
        .join('&')
    },
    handleSubmit(e) {
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.encode({
          'form-name': e.target.getAttribute('name'),
          ...this.formData,
        }),
      })
        .then(() => this.$router.push('/success'))
        .catch((error) => alert(error))
    },
  },
}
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

    label {
      @apply font-bold text-xl;
    }

    textarea,
    input {
      @apply w-full p-2;
      @apply block border border-darkPurple dark:border-gray-100;
      @apply bg-stripeLight dark:bg-stripeDark;
      @apply rounded-md;
    }

    button {
      @apply font-bold font-fira uppercase;
      @apply bg-darkPurple dark:bg-gray-200;
      @apply text-white dark:text-darkPurple;
      @apply py-3 px-5;
      @apply mt-12;
      @apply rounded-md;

      &:hover {
        @apply bg-blue-500 dark:bg-bbbpink;
      }
    }
  }
}
</style>
