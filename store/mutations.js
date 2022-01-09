export default {
  toggleExpanded(state) {
    state.menuExpanded = !state.menuExpanded
  },
  toggleDarkMode(state) {
    state.isDark = !state.isDark
  },
  initDarkMode(state) {
    if (isProduction()) {
      state.isDark = defaultDarkMode()
    }
  }
}

const isProduction = () => {
  return process.env.CONTEXT && process.env.CONTEXT === 'production'
}

function defaultDarkMode() {
  if (localStorage.getItem('darkMode')) {
    return localStorage.getItem('darkMode') === 'true'
  }

  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return true
  }
  return false
}
