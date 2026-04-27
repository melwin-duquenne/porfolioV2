<template>
  <div class="group flex items-center gap-3 rounded-xl border border-warm-border bg-parchment px-4 py-3 transition-all duration-300 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5">
    <div class="h-8 w-8 shrink-0">
      <img
        v-if="!imgError"
        :src="icon"
        :alt="name"
        class="h-full w-full object-contain"
        @error="imgError = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center rounded-lg bg-accent-light text-xs font-bold text-accent"
      >
        {{ name[0].toUpperCase() }}
      </div>
    </div>
    <span class="flex-1 text-sm font-medium text-ink">{{ name }}</span>
    <div class="flex gap-1">
      <div
        v-for="i in 5"
        :key="i"
        class="h-2 w-2 rounded-full transition-all duration-300"
        :class="i <= level ? 'bg-accent' : 'bg-warm-border'"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({
  name:  { type: String, required: true },
  icon:  { type: String, required: true },
  level: { type: Number, required: true },
})
const imgError = ref(false)
</script>
