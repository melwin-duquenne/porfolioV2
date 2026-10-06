// Couleurs du thème lues dans le CSS (src/style.css en est la seule source).
// Un élément témoin porte data-theme="light" ou "dark" : il reçoit les jetons de
// ce thème sans changer celui de la page. Résultat en cache (les jetons sont fixes).
const cache = new Map()

// themeColor('--sky-2', 'dark') → 'rgb(18, 27, 42)'
export function themeColor(token, theme) {
  const key = `${theme}${token}`
  if (!cache.has(key)) {
    const probe = document.createElement('div')
    probe.dataset.theme = theme
    probe.hidden = true
    document.body.appendChild(probe)
    cache.set(key, getComputedStyle(probe).getPropertyValue(token).trim())
    probe.remove()
  }
  return cache.get(key)
}
