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
import { mapGetters } from 'vuex'
export default {
  computed: {
    ...mapGetters(['isDark']),
  },
  watch: {
    isDark(val) {
      const root = document.body
      if (val === true) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
  },
}
</script>
