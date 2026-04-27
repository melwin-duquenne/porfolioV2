<template>
  <Teleport to="body">
    <Transition name="legal-modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          @click="$emit('close')"
        ></div>

        <!-- Carte modale -->
        <div class="legal-card relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl">

          <!-- En-tête fixe -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-warm-border bg-white/95 backdrop-blur-sm px-8 py-5">
            <h2 class="font-serif text-2xl text-ink">Mentions légales</h2>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-parchment-alt hover:text-ink"
              aria-label="Fermer"
              @click="$emit('close')"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Contenu -->
          <div class="px-8 py-7 space-y-8">
            <div
              v-for="section in legalData.sections"
              :key="section.title"
            >
              <h3 class="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {{ section.title }}
              </h3>
              <div class="space-y-2">
                <p
                  v-for="(paragraph, i) in section.paragraphs"
                  :key="i"
                  class="text-sm leading-relaxed text-ink-muted"
                >
                  {{ paragraph }}
                </p>
              </div>
            </div>

            <!-- Date de mise à jour -->
            <p class="border-t border-warm-border pt-6 text-xs text-ink-muted/50">
              Dernière mise à jour : {{ lastUpdated }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import legalData from '../../data/legal.json'

defineProps({ open: { type: Boolean, required: true } })
const emit = defineEmits(['close'])

const lastUpdated = new Date().toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric'
})

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(()   => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.legal-modal-enter-active,
.legal-modal-leave-active {
  transition: opacity 0.3s ease;
}
.legal-modal-enter-from,
.legal-modal-leave-to {
  opacity: 0;
}
.legal-modal-enter-active .legal-card {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.legal-modal-leave-active .legal-card {
  transition: transform 0.25s ease-in, opacity 0.25s ease;
}
.legal-modal-enter-from .legal-card {
  transform: translateY(40px);
  opacity: 0;
}
.legal-modal-leave-to .legal-card {
  transform: translateY(20px);
  opacity: 0;
}
</style>
