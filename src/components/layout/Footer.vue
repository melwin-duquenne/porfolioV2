<template>
  <footer class="bg-ink px-6 py-8 border-t border-white/5">
    <div class="mx-auto flex max-w-5xl items-center justify-between">
      <span class="font-serif text-2xl italic text-white/15">{{ initials }}</span>
      <p class="text-xs text-white/30">© {{ year }} {{ name }}</p>
    </div>
  </footer>
</template>

<script setup>
import aboutData from '../../data/about.json'
const name     = aboutData.name
const initials = name.split(' ').map(n => n[0]).join('')
const year     = new Date().getFullYear()
</script>
