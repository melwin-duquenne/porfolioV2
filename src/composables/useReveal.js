import { onMounted, onUnmounted } from 'vue'

/**
 * Reveal-on-scroll, ported from the React proto's WAAPI approach.
 *
 * Rationale (cf. handoff "Note technique") : l'état au repos est VISIBLE ; l'état
 * caché n'est appliqué qu'avant le reveal via `.reveal:not([data-in])`. Les entrées
 * sont jouées via `element.animate()` (WAAPI), jamais via une transition CSS pilotée
 * par classe — un timeline en pause (onglet en arrière-plan) ne peut donc jamais
 * laisser le contenu invisible. Un filet de sécurité par setTimeout force l'état final.
 *
 * En prod on remplace le scroll-listener du proto par un IntersectionObserver.
 */
export function useReveal() {
  let observer = null

  const reduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const animOn = () =>
    document.documentElement.classList.contains('anim-on')

  function safeAnimate(el, frames, opts) {
    if (!el.animate) return
    let anim
    try {
      anim = el.animate(frames, opts)
    } catch (e) {
      return
    }
    const end = frames[frames.length - 1]
    setTimeout(() => {
      try {
        if (anim.playState !== 'finished') {
          Object.entries(end).forEach(([k, v]) => {
            el.style[k] = v
          })
          anim.cancel()
        }
      } catch (e) {
        /* noop */
      }
    }, (opts.delay || 0) + (opts.duration || 0) + 120)
  }

  function playEntrance(el) {
    if (!animOn() || reduced() || !el.animate) return
    const d = parseInt(el.dataset.d || '0', 10)

    safeAnimate(
      el,
      [
        { opacity: 0, transform: 'translateY(32px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: 760,
        delay: d * 90,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      }
    )

    // skill progress bars : 0 -> --lvl
    el.querySelectorAll('.skill__fill').forEach((f) => {
      const target =
        f.style.getPropertyValue('--lvl') || getComputedStyle(f).width
      safeAnimate(f, [{ width: '0%' }, { width: target }], {
        duration: 1000,
        delay: 200,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      })
    })

    // contact title words rise in
    el.querySelectorAll('.contact__title .wd').forEach((w, i) => {
      safeAnimate(
        w,
        [
          { opacity: 0, transform: 'translateY(38px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 900,
          delay: i * 120,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          fill: 'backwards',
        }
      )
    })
  }

  function revealNow(el) {
    if (el.hasAttribute('data-in')) return
    el.setAttribute('data-in', '')
    playEntrance(el)
  }

  onMounted(() => {
    const els = Array.from(document.querySelectorAll('.reveal'))

    // No motion : tout est visible immédiatement.
    if (!animOn() || reduced()) {
      els.forEach((el) => el.setAttribute('data-in', ''))
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealNow(entry.target)
            observer.unobserve(entry.target)
          }
        })
      },
      // se déclenche quand l'élément entre à ~90% du viewport (proto : top < vh*0.9)
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    )

    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      // déjà visible au chargement -> révéler tout de suite
      if (r.top < window.innerHeight * 0.9 && r.bottom > -50) {
        revealNow(el)
      } else {
        observer.observe(el)
      }
    })
  })

  onUnmounted(() => {
    if (observer) observer.disconnect()
  })
}
