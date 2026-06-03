<template>
  <BaseModal :open="!!project" wide labelledby="pm-title" @close="$emit('close')">
    <template v-if="project">
      <div class="pm__banner">
        <span class="pm__banner-name">{{ project.title }}</span>
      </div>
      <div class="pm__body">
        <div class="pm__tags">
          <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
        <h3 id="pm-title" class="pm__title">{{ project.title }}</h3>
        <p class="pm__desc">{{ project.fullDescription || project.description }}</p>

        <template v-if="project.features && project.features.length">
          <div class="pm__sub"><span class="kicker">Fonctionnalités clés</span></div>
          <ul class="pm__list">
            <li v-for="feature in project.features" :key="feature">{{ feature }}</li>
          </ul>
        </template>

        <a
          class="btn btn--solid pm__cta"
          :href="project.github"
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="GitHub"
        >
          <SvgIcon name="code" /> Voir sur GitHub
        </a>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
import SvgIcon from './SvgIcon.vue'

defineProps({
  project: { type: Object, default: null },
})
defineEmits(['close'])
</script>
