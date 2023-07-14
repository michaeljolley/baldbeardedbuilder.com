const favicons = document.querySelectorAll('link[rel="icon"]')!
const title = document.querySelector('title')!
const titleText = title.innerText

document.addEventListener('visibilitychange', () => {
  const hidden = document.hidden
  const find = hidden ? 'active' : 'inactive'
  const replace = hidden ? 'inactive' : 'active'

  title.innerText = hidden ? 'Hey! Come back!' : titleText

  favicons.forEach((favicon) => {
    favicon.setAttribute(
      'href',
      favicon.getAttribute('href')!.replace(find, replace)
    )
  })
})
