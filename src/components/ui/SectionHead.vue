<template>
  <div class="section-head reveal">
    <span class="kicker">{{ kicker }}</span>
    <h2 class="h-section"><slot /></h2>
    <div class="under"></div>
  </div>
</template>

<script setup>
defineProps({
  kicker: { type: String, required: true },
})
</script>
