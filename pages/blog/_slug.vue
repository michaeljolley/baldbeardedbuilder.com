<template>
  <article>
    <header>
      <cld-image
        v-if="post.cover && post.cover.public_id"
        :alt="post.banner_image_alt || post.title"
        :public-id="post.cover.public_id"
        :title="post.banner_image_alt || post.title"
        quality="auto"
        fetch-format="auto"
        responsive
        ><cld-placeholder type="blur"
      /></cld-image>
    </header>
    <main>
      <aside>
        <TableOfContents
          v-if="post.toc && post.toc.length > 0"
          :toc="post.toc"
          :levels="post.toc.length > 10 ? [2] : [2, 3]"
        />
      </aside>
      <section class="content" v>
        <BlogTopper :post="post" />
        <nuxt-content :document="post" />
      </section>
    </main>
    <footer>
      <RelatedPosts :tags="post.tags" :slug="post.slug" />
    </footer>
  </article>
</template>
<script>
import generateOgraph from '@/middleware/generateOgraph'
import config from '@/modules/config'
export default {
  async asyncData({ $content, params, payload }) {
    if (payload) {
      return { post: payload.post }
    } else {
      const post = await $content('blog', params.slug).fetch()
      return { post }
    }
  },
  head() {
    const link = this.post.canonical_url
      ? [
          {
            rel: 'canonical',
            href: this.post.canonical_url,
          },
        ]
      : null
    const meta = [
      {
        hid: 'description',
        name: 'description',
        content: this.post.description,
      },
      {
        hid: 'twitter:url',
        name: 'twitter:url',
        content: `${config.baseUrl}${this.post.path}/`,
      },
      {
        hid: 'twitter:title',
        name: 'twitter:title',
        content: this.post.title,
      },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content: this.post.description,
      },
      {
        hid: 'twitter:image',
        name: 'twitter:image',
        content: generateOgraph(this.post.title, this.post.tags),
      },
      {
        hid: 'twitter:image:width',
        name: 'twitter:image:width',
        content: '1200',
      },
      {
        hid: 'twitter:image:height',
        name: 'twitter:image:height',
        content: '600',
      },
      {
        hid: 'twitter:image:alt',
        name: 'twitter:image:alt',
        content: this.post.title,
      },
      {
        hid: 'og:url',
        property: 'og:url',
        content: `${config.baseUrl}${this.post.path}/`,
      },
      {
        hid: 'og:title',
        property: 'og:title',
        content: `${this.post.title}${config.baseSplitter}${config.baseTitle}`,
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: this.post.description,
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: generateOgraph(this.post.title, this.post.tags),
      },
      {
        hid: 'og:image:width',
        name: 'og:image:width',
        content: '1200',
      },
      {
        hid: 'og:image:height',
        name: 'og:image:height',
        content: '600',
      },
      {
        hid: 'og:image:alt',
        name: 'og:image:alt',
        content: this.post.title,
      },
      {
        hid: 'og:updated_time',
        property: 'og:updated_time',
        content: this.post.updatedAt,
      },
      {
        hid: 'og:site_name',
        property: 'og:site_name',
        content: `${this.post.title}${config.baseSplitter}${config.baseBrand}`,
      },
      { hid: 'og:type', property: 'og:type', content: 'website' },
    ]
    return {
      title: this.post.title,
      meta,
      link,
    }
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
      @apply hidden lg:flex flex-col;
      @apply z-0;
      @apply sticky;
      top: 105px;
      @apply lg:w-1/5;

      @apply text-darkPurple dark:text-gray-100;
    }

    .content {
      @apply mx-auto;
      @screen lg {
        margin-left: unset;
        margin-right: unset;
      }
    }
  }
}
</style>
