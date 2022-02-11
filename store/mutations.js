export default {
  toggleExpanded(state) {
    state.menuExpanded = !state.menuExpanded
  },
  toggleDarkMode(state) {
    state.isDark = !state.isDark
  }
}

// function defaultDarkMode() {
//   if (window.localStorage.getItem('darkMode')) {
//     return window.localStorage.getItem('darkMode') === 'true'
//   }

//   if (
//     window.matchMedia &&
//     window.matchMedia('(prefers-color-scheme: dark)').matches
//   ) {
//     return true
//   }
//   return false
// }
