<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledby"
        @click.self="$emit('close')"
      >
        <div
          ref="panel"
          class="modal__panel"
          :class="{ 'modal__panel--wide': wide }"
        >
          <button
            class="modal__close"
            aria-label="Fermer"
            data-cursor="fermer"
            @click="$emit('close')"
          >
            <SvgIcon name="close" width="18" height="18" />
          </button>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import SvgIcon from './SvgIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  labelledby: { type: String, default: undefined },
})

const emit = defineEmits(['close'])
const panel = ref(null)

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      // entrée jouée en WAAPI (visible par défaut si le timeline est en pause)
      requestAnimationFrame(() => {
        const p = panel.value
        if (
          p &&
          p.animate &&
          document.documentElement.classList.contains('anim-on') &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          try {
            p.animate(
              [
                { transform: 'translateY(20px) scale(.985)' },
                { transform: 'none' },
              ],
              { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }
            )
          } catch (e) {
            /* noop */
          }
        }
      })
    } else {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>
