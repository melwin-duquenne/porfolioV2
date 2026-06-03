import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Scrollspy + état "scrolled" de la nav.
 * Met à jour la section active selon la section visible (offset +140px, cf. proto).
 */
export function useScrollSpy(ids, { offset = 140, scrolledAt = 12 } = {}) {
  const active = ref(ids[0])
  const scrolled = ref(false)

  function onScroll() {
    const y = window.scrollY + offset
    let cur = ids[0]
    ids.forEach((id) => {
      const s = document.getElementById(id)
      if (s && s.offsetTop <= y) cur = id
    })
    if (active.value !== cur) active.value = cur

    const next = window.scrollY > scrolledAt
    if (scrolled.value !== next) scrolled.value = next
  }

  onMounted(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })

  return { active, scrolled }
}
