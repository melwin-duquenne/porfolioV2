import { createSSRApp } from 'vue'
import './style.css'
import App from './App.vue'

// Découplage anim-on / anim-off (cf. handoff). Respecte prefers-reduced-motion :
// au repos tout est visible, les animations infinies sont neutralisées.
// Posé avant le mount pour éviter tout flash sur les éléments .reveal.
const root = document.documentElement
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
root.classList.add(reduced ? 'anim-off' : 'anim-on')
if (!reduced && !window.matchMedia('(hover: none)').matches) {
  document.body.classList.add('cursor-on')
}

// createSSRApp + mount = hydratation du HTML prérendu (cf. scripts/prerender.mjs).
// Sans prérendu (#app vide), Vue monte normalement à la place.
createSSRApp(App).mount('#app')
