<template>
  <section id="competences" class="section-pad">
    <div class="wrap">
      <SectionHead kicker="Stack technique">Compétences</SectionHead>
    </div>

    <div class="marquee-wrap reveal">
      <div class="marquee">
        <span v-for="(item, i) in marqueeLoop" :key="i">{{ item }}</span>
      </div>
    </div>

    <div class="wrap">
      <div
        v-for="group in skillsData.categories"
        :key="group.name"
        class="skill-group"
      >
        <div class="skill-group__label reveal">{{ group.name }}</div>
        <div class="skill-grid">
          <SkillCard
            v-for="(skill, i) in group.skills"
            :key="skill.name"
            :name="skill.name"
            :level="skill.level"
            :mono="skill.mono"
            :color="skill.color"
            :fg="skill.fg"
            :index="i"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHead from '../ui/SectionHead.vue'
import SkillCard from '../ui/SkillCard.vue'
import skillsData from '../../data/skills.json'

// duplique la liste pour un défilement infini (translateX -50%)
const marqueeLoop = [...skillsData.marquee, ...skillsData.marquee]
</script>
