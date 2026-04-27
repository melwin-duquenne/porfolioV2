<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="project"
        class="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          @click="$emit('close')"
        ></div>

        <!-- Carte modale -->
        <div class="modal-card relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl">

          <!-- Image -->
          <div class="relative aspect-video w-full overflow-hidden bg-parchment-alt shrink-0">
            <img
              v-if="!imgError"
              :src="project.image"
              :alt="project.title"
              class="h-full w-full object-cover"
              @error="imgError = true"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-light to-parchment-alt"
            >
              <span class="font-serif text-6xl italic text-accent/25">{{ project.title[0] }}</span>
            </div>

            <!-- Bouton fermer -->
            <button
              class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-ink"
              aria-label="Fermer"
              @click="$emit('close')"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Contenu -->
          <div class="p-7 sm:p-9">
            <!-- Tags -->
            <div class="mb-4 flex flex-wrap gap-1.5">
              <span
                v-for="tag in project.tags"
                :key="tag"
                class="rounded-md bg-accent-light px-2.5 py-1 text-[11px] font-medium text-accent"
              >{{ tag }}</span>
            </div>

            <!-- Titre -->
            <h2 class="font-serif text-3xl text-ink mb-5 leading-tight">{{ project.title }}</h2>

            <!-- Description complète -->
            <p class="text-base leading-relaxed text-ink-muted mb-7 whitespace-pre-line">
              {{ project.fullDescription || project.description }}
            </p>

            <!-- Fonctionnalités -->
            <div v-if="project.features && project.features.length" class="mb-8">
              <h3 class="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent flex items-center gap-3">
                <span class="h-px w-6 bg-accent"></span>
                Fonctionnalités clés
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="feature in project.features"
                  :key="feature"
                  class="flex items-start gap-3 text-sm text-ink-muted"
                >
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"></span>
                  {{ feature }}
                </li>
              </ul>
            </div>

            <!-- Bouton GitHub -->
            <a
              :href="project.github"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-3 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-parchment transition-all duration-300 hover:bg-accent hover:gap-4"
            >
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Voir sur GitHub
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  project: { type: Object, default: null },
})

const emit = defineEmits(['close'])
const imgError = ref(false)

watch(() => props.project, () => { imgError.value = false })

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(()   => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-card {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.modal-leave-active .modal-card {
  transition: transform 0.25s ease-in, opacity 0.25s ease;
}
.modal-enter-from .modal-card {
  transform: translateY(40px);
  opacity: 0;
}
.modal-leave-to .modal-card {
  transform: translateY(20px);
  opacity: 0;
}
</style>
