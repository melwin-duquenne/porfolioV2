<template>
  <article
    ref="card"
    class="card reveal"
    :data-d="String((index % 3) + 1)"
    data-cursor="détails"
    @click="$emit('open')"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >
    <div class="card__spot"></div>

    <div class="card__media">
      <span class="card__num">{{ num }}</span>
      <img
        v-if="!imgError"
        :src="image"
        :alt="title"
        loading="lazy"
        @error="imgError = true"
      />
      <div v-else class="img-fallback">{{ title[0] }}</div>
      <span class="card__view">voir <SvgIcon name="code" /></span>
    </div>

    <div class="card__body">
      <h3 class="card__title">{{ title }}</h3>
      <p class="card__desc">{{ description }}</p>
      <div class="card__tags">
        <span v-for="tag in tags.slice(0, 5)" :key="tag" class="tag">{{ tag }}</span>
        <span v-if="tags.length > 5" class="tag tag--more">+{{ tags.length - 5 }}</span>
      </div>
    </div>

    <div class="card__foot">
      <span class="gh tlink">Voir le détail <SvgIcon name="arrow" width="15" height="15" /></span>
      <a
        class="gh tlink gh--code"
        :href="github"
        target="_blank"
        rel="noopener noreferrer"
        data-cursor="code"
        @click.stop
      >
        <SvgIcon name="code" /> Code
      </a>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import SvgIcon from './SvgIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  github: { type: String, required: true },
  tags: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
})

defineEmits(['open'])

const card = ref(null)
const imgError = ref(false)
const num = computed(() => String(props.index + 1).padStart(2, '0'))

function onMove(e) {
  const el = card.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  el.style.setProperty('--mx', px * 100 + '%')
  el.style.setProperty('--my', py * 100 + '%')
  if (document.documentElement.classList.contains('anim-on')) {
    el.style.transform = `perspective(900px) rotateX(${(py - 0.5) * -5}deg) rotateY(${
      (px - 0.5) * 7
    }deg) translateY(-6px)`
  }
}

function onLeave() {
  if (card.value) card.value.style.transform = ''
}
</script>
