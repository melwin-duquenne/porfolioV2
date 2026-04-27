<template>
  <section id="projects" class="bg-white px-6 py-24">
    <div class="mx-auto max-w-5xl">
      <SectionTitle title="Projets" />

      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCard
          v-for="project in projectsData.projects"
          :key="project.title"
          :title="project.title"
          :description="project.description"
          :image="project.image"
          :github="project.github"
          :tags="project.tags"
          @open="openProject = project"
        />
      </div>
    </div>

    <ProjectModal
      :project="openProject"
      @close="openProject = null"
    />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import SectionTitle  from '../ui/SectionTitle.vue'
import ProjectCard   from '../ui/ProjectCard.vue'
import ProjectModal  from '../ui/ProjectModal.vue'
import projectsData  from '../../data/projects.json'

const openProject = ref(null)
</script>
