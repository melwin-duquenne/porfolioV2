<template>
  <nav class="nav" :class="{ scrolled }">
    <a href="#top" class="nav__logo" data-cursor aria-label="Retour en haut">
      <img src="/images/md.png" alt="Melwin Duquenne" />
    </a>
    <div class="nav__links">
      <NavLink
        v-for="link in links"
        :key="link.target"
        :label="link.label"
        :target="link.target"
        :active="active === link.target"
      />
    </div>
  </nav>
</template>

<script setup>
import NavLink from '../ui/NavLink.vue'
import { useScrollSpy } from '../../composables/useScrollSpy'

const links = [
  { label: 'À propos', target: 'apropos' },
  { label: 'Compétences', target: 'competences' },
  { label: 'Projets', target: 'projets' },
  { label: 'Contact', target: 'contact' },
]

const { active, scrolled } = useScrollSpy(links.map((l) => l.target))
</script>
