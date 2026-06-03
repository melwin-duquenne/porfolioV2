import { onMounted, onUnmounted } from 'vue'

/**
 * Parallax du hero : la couche `target` suit la souris (depth) et le scroll
 * (facteur .18 × scrollY tant que scrollY < innerHeight). Cf. proto Hero.
 */
export function useParallax(sectionRef, targetRef, { depth = 0.16 } = {}) {
  const animOn = () =>
    document.documentElement.classList.contains('anim-on')

  function onMove(e) {
    if (!animOn()) return
    const el = sectionRef.value
    const layer = targetRef.value
    if (!el || !layer) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.width / 2) / r.width
    const dy = (e.clientY - r.height / 2) / r.height
    layer.style.transform = `translate(${dx * depth * 26}px, ${dy * depth * 14}px)`
  }

  function onScroll() {
    const layer = targetRef.value
    if (!layer) return
    const y = window.scrollY
    if (y > window.innerHeight) return
    layer.style.transform = `translateY(${y * depth * 0.18}px)`
  }

  onMounted(() => {
    const el = sectionRef.value
    if (el) el.addEventListener('mousemove', onMove)
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onUnmounted(() => {
    const el = sectionRef.value
    if (el) el.removeEventListener('mousemove', onMove)
    window.removeEventListener('scroll', onScroll)
  })
}
