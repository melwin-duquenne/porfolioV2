<template>
  <footer class="bg-ink px-6 py-8 border-t border-white/5">
    <div class="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <span class="font-serif text-2xl italic text-white/15">{{ initials }}</span>
      <p class="text-xs text-white/30">© {{ year }} {{ name }}</p>
      <button
        class="text-xs text-white/30 underline underline-offset-2 transition-colors duration-200 hover:text-white/60"
        @click="legalOpen = true"
      >
        Mentions légales
      </button>
    </div>
  </footer>

  <LegalModal :open="legalOpen" @close="legalOpen = false" />
</template>

<script setup>
import { ref } from 'vue'
import LegalModal from '../ui/LegalModal.vue'
import aboutData from '../../data/about.json'

const name     = aboutData.name
const initials = name.split(' ').map(n => n[0]).join('')
const year     = new Date().getFullYear()

const legalOpen = ref(false)
</script>
