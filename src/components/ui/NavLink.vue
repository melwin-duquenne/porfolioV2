<template>
  <a
    :href="`#${target}`"
    class="nav__link"
    :class="{ active }"
    data-cursor
  >
    {{ label }}
  </a>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  target: { type: String, required: true },
  active: { type: Boolean, default: false },
})
</script>
