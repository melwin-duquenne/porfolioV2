<template>
  <nav
    :class="scrolled
      ? 'bg-parchment/95 backdrop-blur-md border-b border-warm-border shadow-sm'
      : 'bg-transparent border-b border-transparent'"
    class="fixed left-0 right-0 top-0 z-50 transition-all duration-500"
  >
    <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <!-- Logo initiales -->
      <a
        href="#hero"
        class="font-serif text-xl italic text-accent transition-colors duration-300 hover:text-ink"
      >
        {{ initials }}
      </a>

      <!-- Liens desktop -->
      <div class="hidden items-center gap-8 md:flex">
        <NavLink label="À propos"    target="about"    />
        <NavLink label="Compétences" target="skills"   />
        <NavLink label="Projets"     target="projects" />
        <NavLink label="Contact"     target="contact"  />
      </div>

      <!-- Burger mobile -->
      <button
        class="flex flex-col gap-[5px] p-1 md:hidden"
        :aria-expanded="mobileOpen"
        aria-label="Menu"
        @click="mobileOpen = !mobileOpen"
      >
        <span
          class="block h-px w-6 bg-ink transition-all duration-300 origin-center"
          :class="mobileOpen ? 'rotate-45 translate-y-[8.5px]' : ''"
        ></span>
        <span
          class="block h-px w-6 bg-ink transition-all duration-300"
          :class="mobileOpen ? 'opacity-0 scale-x-0' : ''"
        ></span>
        <span
          class="block h-px w-6 bg-ink transition-all duration-300 origin-center"
          :class="mobileOpen ? '-rotate-45 -translate-y-[8.5px]' : ''"
        ></span>
      </button>
    </div>

    <!-- Menu mobile -->
    <div
      v-show="mobileOpen"
      class="border-t border-warm-border bg-parchment px-6 py-5 md:hidden flex flex-col gap-5"
    >
      <a v-for="link in mobileLinks" :key="link.target"
         :href="`#${link.target}`"
         class="text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-accent"
         @click="mobileOpen = false"
      >
        {{ link.label }}
      </a>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import NavLink from '../ui/NavLink.vue'
import aboutData from '../../data/about.json'

const parts    = aboutData.name.split(' ')
const initials = parts.map(n => n[0]).join('')

const scrolled    = ref(false)
const mobileOpen  = ref(false)
const mobileLinks = [
  { label: 'À propos',    target: 'about'    },
  { label: 'Compétences', target: 'skills'   },
  { label: 'Projets',     target: 'projects' },
  { label: 'Contact',     target: 'contact'  },
]

function onScroll() { scrolled.value = window.scrollY > 24 }
onMounted(()   => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>
