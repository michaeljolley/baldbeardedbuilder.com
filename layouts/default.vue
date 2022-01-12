<template>
  <div class="wrapper">
    <PageHeader />
    <main>
      <Nuxt />
    </main>
    <PageFooter />
    <BackToTop />
  </div>
</template>
<script>
import { mapActions, mapGetters } from 'vuex'
export default {
  head() {
    return {
      bodyAttrs: {
        class: this.isDark ? 'dark' : '',
      },
    }
  },
  computed: {
    ...mapGetters(['isDark']),
  },
  created() {
    this.initDarkMode()
  },
  methods: {
    ...mapActions(['initDarkMode']),
  },
}
</script>
