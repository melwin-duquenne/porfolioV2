import { onMounted, onUnmounted } from 'vue'

/**
 * Boutons magnétiques : `.btn`, `.social`, `.nav__logo` se décalent vers le
 * curseur au survol (facteur .25 / .3), retour à 0 en quittant. Cf. proto app.jsx.
 * Désactivé sur pointeurs grossiers.
 */
export function useMagnetic(selector = '.btn, .social, .nav__logo') {
  let handlers = []

  onMounted(() => {
    if (
      !document.documentElement.classList.contains('anim-on') ||
      window.matchMedia('(hover: none)').matches
    ) {
      return
    }
    document.querySelectorAll(selector).forEach((el) => {
      const move = (e) => {
        const r = el.getBoundingClientRect()
        el.style.transform = `translate(${
          (e.clientX - (r.left + r.width / 2)) * 0.25
        }px, ${(e.clientY - (r.top + r.height / 2)) * 0.3}px)`
      }
      const leave = () => {
        el.style.transform = ''
      }
      el.addEventListener('mousemove', move)
      el.addEventListener('mouseleave', leave)
      handlers.push([el, move, leave])
    })
  })

  onUnmounted(() => {
    handlers.forEach(([el, move, leave]) => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
      el.style.transform = ''
    })
    handlers = []
  })
}
