<template>
  <BaseModal :open="open" labelledby="lm-title" @close="$emit('close')">
    <div class="lm__head">
      <h3 id="lm-title" class="lm__title">Mentions légales</h3>
    </div>
    <div class="lm__body">
      <div v-for="section in legalData.sections" :key="section.title" class="lm__sec">
        <h4 class="lm__h">{{ section.title }}</h4>
        <p v-for="(p, i) in section.paragraphs" :key="i" class="lm__p">{{ p }}</p>
      </div>
      <div class="lm__updated">Dernière mise à jour : {{ legalData.updated }}</div>
    </div>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
import legalData from '../../data/legal.json'

defineProps({ open: { type: Boolean, required: true } })
defineEmits(['close'])
</script>
