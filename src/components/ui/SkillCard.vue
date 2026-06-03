<template>
  <div class="skill reveal" :data-d="String((index % 3) + 1)">
    <div class="skill__icon" :style="{ background: color, color: fg || '#fff' }">
      {{ mono }}
    </div>
    <div>
      <div class="skill__name">
        <span>{{ name }}</span>
        <span class="skill__lvl">{{ level }}/5</span>
      </div>
      <div class="skill__bar">
        <div class="skill__fill" :style="{ '--lvl': (level / 5) * 100 + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  level: { type: Number, required: true },
  mono: { type: String, required: true },
  color: { type: String, required: true },
  fg: { type: String, default: '' },
  index: { type: Number, default: 0 },
})
</script>
