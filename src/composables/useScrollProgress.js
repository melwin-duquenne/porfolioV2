import { ref, onMounted, onUnmounted } from 'vue'

/** Largeur de la barre de progression = % de scroll de la page. */
export function useScrollProgress() {
  const progress = ref(0)

  function onScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight
    progress.value = h > 0 ? (window.scrollY / h) * 100 : 0
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

  return { progress }
}
