import Vue from 'vue'

Vue.directive('scroll', {
  inserted(el, binding) {
    const stickyPoint = el.offsetTop

    if (stickyPoint === 0) {
      el.classList.add('sticky')
    } else {
      const onScroll = function (evt) {
        if (window.pageYOffset > stickyPoint) {
          el.classList.add('sticky')
        } else {
          el.classList.remove('sticky')
        }
      }
      window.addEventListener('scroll', onScroll)
    }
  },
})
