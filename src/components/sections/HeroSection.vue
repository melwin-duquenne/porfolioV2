<template>
  <section id="hero" ref="section" class="hero">
    <div class="hero__media">
      <div class="hero__sky"></div>
      <div ref="photo" class="hero__photo"></div>
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
      </div>
    </div>

    <div class="hero__scroll">
      <span>défiler</span>
      <span class="bar"></span>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SvgIcon from '../ui/SvgIcon.vue'
import aboutData from '../../data/about.json'
import { useParallax } from '../../composables/useParallax'

const first = aboutData.first
const last = aboutData.last
const role = aboutData.role
const lede = aboutData.intro

const section = ref(null)
const photo = ref(null)
const sub = ref(null)
const cta = ref(null)

// parallax de la couche photo (souris + scroll)
useParallax(section, photo, { depth: 0.16 })

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
