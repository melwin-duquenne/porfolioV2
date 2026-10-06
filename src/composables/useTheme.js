import { ref } from 'vue'
import { themeColor } from '../themeColors'

// Thème clair / sombre. La valeur initiale est posée sur <html data-theme> par
// le petit script d'index.html, avant le premier rendu (pas de flash) : choix
// fait pendant cette visite, sinon l'heure du visiteur (nuit de 20 h à 7 h).
// Le choix du bouton ne vaut que pour la visite (sessionStorage) : à la suivante,
// le site suit de nouveau l'heure, au lieu de rester bloqué en jour ou en nuit.
const KEY = 'theme'

const root = document.documentElement
const isDark = ref(root.dataset.theme === 'dark')

// couleur de la barre du navigateur mobile = fond du thème
const syncThemeColor = (theme) =>
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor('--bg', theme))
syncThemeColor(root.dataset.theme)

function apply(dark) {
  const value = dark ? 'dark' : 'light'
  isDark.value = dark
  root.dataset.theme = value
  syncThemeColor(value)
  try {
    sessionStorage.setItem(KEY, value)
  } catch (e) {
    // stockage indisponible (navigation privée…) : le choix vaut pour cette page
  }
}

export function useTheme() {
  const toggle = () => apply(!isDark.value)
  return { isDark, toggle }
}
