<template>
  <section id="hero" ref="section" class="hero" :class="{ 'hero--3d': is3D }">
    <div class="hero__media">
      <div class="hero__sky"></div>
      <div ref="photo" class="hero__photo"></div>
      <canvas ref="canvas3d" class="hero__canvas" aria-hidden="true"></canvas>
      <div class="hero__grad"></div>
    </div>

    <div class="wrap hero__inner">
      <div class="hero__eyebrow">
        <span class="kicker">Portfolio — {{ role }}</span>
      </div>

      <h1 class="hero__name">
        <span class="ln"><span class="wd">{{ first }}</span></span>
        <span class="ln l2"><span class="wd">{{ last }}</span></span>
      </h1>

      <p ref="sub" class="hero__sub">{{ lede }}</p>

      <div ref="cta" class="hero__cta">
        <a href="#projets" class="btn" data-cursor="voir">
          Voir mes projets
          <span class="ar"><SvgIcon name="arrow" width="16" height="16" /></span>
        </a>
        <a href="#contact" class="tlink" data-cursor>Me contacter</a>
        <a :href="cv" class="tlink" download data-cursor>
          Mon CV <SvgIcon name="download" width="16" height="16" />
        </a>
      </div>
    </div>

    <div class="hero__scroll">
      <span>défiler</span>
      <span class="bar"></span>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import SvgIcon from '../ui/SvgIcon.vue'
import aboutData from '../../data/about.json'
import { useParallax } from '../../composables/useParallax'
import { useTheme } from '../../composables/useTheme'

const first = aboutData.first
const last = aboutData.last
const role = aboutData.role
const lede = aboutData.intro
const cv = aboutData.cv

const section = ref(null)
const photo = ref(null)
const sub = ref(null)
const cta = ref(null)

// parallax de la couche photo (souris + scroll) — inutile quand la 3D la remplace
useParallax(section, photo, { depth: 0.16, enabled: () => !is3D.value })

// ---------- montagne 3D (Three.js) ----------
// La photo reste le rendu par défaut : la 3D n'est chargée qu'après le premier
// affichage, et seulement sur desktop correct. Mobile / PC faible gardent la photo.
const canvas3d = ref(null)
const is3D = ref(false)
let scene3d = null
let io = null
let unmounted = false

function canUse3D() {
  if (!document.documentElement.classList.contains('anim-on')) return false
  if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) return false
  if ((navigator.hardwareConcurrency || 4) < 4) return false
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false
  if (navigator.connection?.saveData) return false
  try {
    // failIfMajorPerformanceCaveat : pas de contexte si le GPU est émulé
    const gl = document
      .createElement('canvas')
      .getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!gl) return false
    // rendu logiciel (pas de GPU : PageSpeed, VM, pilote absent) → des secondes de blocage
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const gpu = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext() // sonde : on rend le contexte tout de suite
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)
  } catch (e) {
    return false
  }
}

function teardown3D() {
  is3D.value = false
  io?.disconnect()
  io = null
  scene3d?.dispose()
  scene3d = null
}

async function init3D() {
  if (unmounted || !canUse3D()) return
  try {
    const { createMountainScene } = await import('../../three/mountainScene.js')
    if (unmounted) return
    scene3d = await createMountainScene(canvas3d.value, { onSlow: teardown3D })
    // construite par étapes : le composant a pu être démonté entre-temps
    if (unmounted) return teardown3D()
    scene3d.setNight(isDark.value) // immédiat : la boucle ne tourne pas encore
  } catch (e) {
    return // WebGL indisponible : on reste sur la photo
  }
  // on ne fait tourner la boucle que quand le hero est à l'écran
  io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) scene3d?.start()
    else scene3d?.stop()
  })
  io.observe(section.value)
  is3D.value = true
}

// mode nuit de la montagne, calé sur le thème du site
const { isDark } = useTheme()
watch(isDark, (dark) => scene3d?.setNight(dark))

onMounted(() => {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200))
  idle(init3D, { timeout: 2500 })
})

onBeforeUnmount(() => {
  unmounted = true
  teardown3D()
})

// Entrée jouée via Web Animations API directement sur les nœuds (cf. handoff).
onMounted(() => {
  const animOn = document.documentElement.classList.contains('anim-on')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!animOn || reduced) return

  const safe = (node, frames, opts) => {
    if (!node || !node.animate) return
    let a
    try {
      a = node.animate(frames, opts)
    } catch (e) {
      return
    }
    const end = frames[frames.length - 1]
    setTimeout(() => {
      try {
        if (a.playState !== 'finished') {
          Object.entries(end).forEach(([k, v]) => {
            node.style[k] = v
          })
          a.cancel()
        }
      } catch (e) {
        /* noop */
      }
    }, (opts.delay || 0) + (opts.duration || 0) + 120)
  }

  // chaque mot du nom monte de translateY(110%) -> 0
  section.value.querySelectorAll('.hero__name .wd').forEach((w, i) => {
    safe(
      w,
      [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }],
      {
        duration: 1050,
        delay: 150 + i * 130,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'backwards',
      }
    )
  })

  // sous-titre et CTA montent en fondu
  ;[sub.value, cta.value].forEach((el, i) => {
    safe(
      el,
      [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: 800,
        delay: 550 + i * 150,
        easing: 'ease',
        fill: 'backwards',
      }
    )
  })
})
</script>
