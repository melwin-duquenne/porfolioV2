<template>
  <article
    class="group flex flex-col overflow-hidden rounded-2xl border border-warm-border bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-ink/8 cursor-pointer"
    @click="$emit('open')"
  >
    <!-- Image avec overlay "Voir plus" au hover -->
    <div class="relative aspect-video overflow-hidden bg-parchment-alt">
      <img
        v-if="!imgError"
        :src="image"
        :alt="title"
        class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        @error="imgError = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-light to-parchment-alt"
      >
        <span class="font-serif text-5xl italic text-accent/25">{{ title[0] }}</span>
      </div>

      <!-- Overlay "Voir plus" -->
      <div class="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span class="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-ink backdrop-blur-sm">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Voir plus
        </span>
      </div>
    </div>

    <!-- Contenu -->
    <div class="flex flex-1 flex-col gap-3 p-6">
      <h3 class="font-serif text-xl text-ink leading-snug">{{ title }}</h3>
      <p class="flex-1 text-sm leading-relaxed text-ink-muted line-clamp-3">{{ description }}</p>

      <!-- Tags -->
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="tag in tags"
          :key="tag"
          class="rounded-md bg-accent-light px-2.5 py-1 text-[11px] font-medium text-accent"
        >{{ tag }}</span>
      </div>

      <!-- GitHub — @click.stop pour ne pas déclencher l'ouverture du modal -->
      <a
        :href="github"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-1 inline-flex items-center gap-2 self-start text-sm font-medium text-ink-muted transition-all duration-200 hover:text-accent hover:gap-3"
        @click.stop
      >
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub
      </a>
    </div>
  </article>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  image:       { type: String, required: true },
  github:      { type: String, required: true },
  tags:        { type: Array,  default: () => [] },
})

defineEmits(['open'])

const imgError = ref(false)
</script>
