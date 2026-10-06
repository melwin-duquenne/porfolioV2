<template>
  <nav class="nav" :class="{ scrolled }">
    <a href="#top" class="nav__logo" data-cursor aria-label="Retour en haut">
      <img src="/images/md.png" alt="Melwin Duquenne" />
    </a>
    <div class="nav__right">
      <div class="nav__links">
        <NavLink
          v-for="link in links"
          :key="link.target"
          :label="link.label"
          :target="link.target"
          :active="active === link.target"
        />
      </div>
      <button
        type="button"
        class="theme-toggle"
        data-cursor
        :aria-label="dark ? 'Passer en mode jour' : 'Passer en mode nuit'"
        :title="dark ? 'Mode jour' : 'Mode nuit'"
        @click="toggle"
      >
        <!-- les deux icônes restent dans le DOM : bascule animée en CSS -->
        <SvgIcon name="moon" class="theme-toggle__icon theme-toggle__icon--moon" />
        <SvgIcon name="sun" class="theme-toggle__icon theme-toggle__icon--sun" />
      </button>
    </div>
  </nav>
</template>

<script setup>
import NavLink from '../ui/NavLink.vue'
import SvgIcon from '../ui/SvgIcon.vue'
import { useScrollSpy } from '../../composables/useScrollSpy'
import { useTheme } from '../../composables/useTheme'

const links = [
  { label: 'À propos', target: 'apropos' },
  { label: 'Compétences', target: 'competences' },
  { label: 'Projets', target: 'projets' },
  { label: 'Contact', target: 'contact' },
]

const { active, scrolled } = useScrollSpy(links.map((l) => l.target))
const { isDark: dark, toggle } = useTheme()
</script>
