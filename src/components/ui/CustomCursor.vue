<template>
  <div class="cursor" aria-hidden="true">
    <div ref="dot" class="cursor__dot"></div>
    <div ref="ring" class="cursor__ring">
      <span ref="label" class="cursor__label"></span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const dot = ref(null)
const ring = ref(null)
const label = ref(null)

let raf = null
let mx = 0
let my = 0
let rx = 0
let ry = 0

function move(e) {
  mx = e.clientX
  my = e.clientY
  if (dot.value) {
    dot.value.style.left = mx + 'px'
    dot.value.style.top = my + 'px'
  }
}

function loop() {
  // le point suit instantanément ; l'anneau suit avec un lissage (lerp .16)
  rx += (mx - rx) * 0.16
  ry += (my - ry) * 0.16
  if (ring.value) {
    ring.value.style.left = rx + 'px'
    ring.value.style.top = ry + 'px'
  }
  raf = requestAnimationFrame(loop)
}

function over(e) {
  const r = ring.value
  if (!r) return
  const t = e.target.closest('a, button, .card, .skill, [data-cursor]')
  if (t) {
    const cue = t.getAttribute('data-cursor')
    if (cue) {
      r.classList.add('is-drag')
      r.classList.remove('is-hover')
      if (label.value) label.value.textContent = cue
    } else {
      r.classList.add('is-hover')
      r.classList.remove('is-drag')
    }
  } else {
    r.classList.remove('is-hover', 'is-drag')
  }
}

onMounted(() => {
  mx = window.innerWidth / 2
  my = window.innerHeight / 2
  rx = mx
  ry = my
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseover', over)
  loop()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', move)
  window.removeEventListener('mouseover', over)
  if (raf) cancelAnimationFrame(raf)
})
</script>
