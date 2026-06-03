<template>
  <section id="projets" class="section-pad">
    <div class="wrap">
      <SectionHead :kicker="`Sélection — ${projects.length} projets`">Projets</SectionHead>

      <div class="proj-grid">
        <ProjectCard
          v-for="(project, i) in projects"
          :key="project.title"
          :title="project.title"
          :description="project.description"
          :image="project.image"
          :github="project.github"
          :tags="project.tags"
          :index="i"
          @open="openProject = project"
        />
      </div>
    </div>

    <ProjectModal :project="openProject" @close="openProject = null" />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import SectionHead from '../ui/SectionHead.vue'
import ProjectCard from '../ui/ProjectCard.vue'
import ProjectModal from '../ui/ProjectModal.vue'
import projectsData from '../../data/projects.json'

const projects = projectsData.projects
const openProject = ref(null)
</script>
