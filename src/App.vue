<template>
  <div>
    <div class="scroll-progress" :style="{ width: progress + '%' }"></div>
    <div class="bg-grain"></div>
    <CustomCursor v-if="showCursor" />

    <NavBar />
    <main id="top">
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from './components/layout/NavBar.vue'
import Footer from './components/layout/Footer.vue'
import CustomCursor from './components/ui/CustomCursor.vue'
import HeroSection from './components/sections/HeroSection.vue'
import AboutSection from './components/sections/AboutSection.vue'
import SkillsSection from './components/sections/SkillsSection.vue'
import ProjectsSection from './components/sections/ProjectsSection.vue'
import ContactSection from './components/sections/ContactSection.vue'
import { useReveal } from './composables/useReveal'
import { useScrollProgress } from './composables/useScrollProgress'
import { useMagnetic } from './composables/useMagnetic'

const showCursor = ref(false)

const { progress } = useScrollProgress()
useReveal()
useMagnetic()

onMounted(() => {
  showCursor.value =
    document.documentElement.classList.contains('anim-on') &&
    !window.matchMedia('(hover: none)').matches
})
</script>
