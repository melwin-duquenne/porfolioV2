<template>
  <div class="mb-14">
    <h2 class="font-serif leading-tight text-ink mb-4" style="font-size: clamp(2.2rem, 5vw, 3.5rem)">
      {{ title }}
    </h2>
    <div class="h-[3px] w-10 rounded-full bg-accent"></div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, required: true } })
</script>
