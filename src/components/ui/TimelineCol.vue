<template>
  <div class="reveal">
    <div class="tl-head"><span class="kicker amber">{{ label }}</span></div>
    <ul class="timeline">
      <li v-for="(it, i) in items" :key="i" class="tl-item">
        <div class="tl-date">{{ it.date }}</div>
        <h4 class="tl-title">{{ it.title }}</h4>
        <div class="tl-org">{{ it.org }}</div>
        <div v-if="it.loc" class="tl-loc">{{ it.loc }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  items: { type: Array, default: () => [] },
})
</script>
