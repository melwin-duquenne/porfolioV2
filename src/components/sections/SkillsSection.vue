<template>
  <section id="skills" class="bg-parchment-alt px-6 py-24">
    <div class="mx-auto max-w-5xl">
      <SectionTitle title="Compétences" />

      <div class="space-y-12">
        <div
          v-for="category in skillsData.categories"
          :key="category.name"
        >
          <!-- Séparateur de catégorie -->
          <div class="mb-5 flex items-center gap-4">
            <span class="text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-muted shrink-0">
              {{ category.name }}
            </span>
            <div class="h-px flex-1 bg-warm-border"></div>
          </div>

          <!-- Grille de badges -->
          <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <SkillBadge
              v-for="skill in category.skills"
              :key="skill.name"
              :name="skill.name"
              :icon="skill.icon"
              :level="skill.level"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionTitle from '../ui/SectionTitle.vue'
import SkillBadge   from '../ui/SkillBadge.vue'
import skillsData   from '../../data/skills.json'
</script>
