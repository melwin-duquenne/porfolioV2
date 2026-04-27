<template>
  <a
    :href="`#${target}`"
    class="relative text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-ink
           after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0
           after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
  >
    {{ label }}
  </a>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  target: { type: String, required: true },
})
</script>
