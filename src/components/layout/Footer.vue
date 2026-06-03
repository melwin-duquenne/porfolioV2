<template>
  <footer class="footer">
    <div class="wrap">
      <span class="footer__logo">{{ first }}<b>.</b></span>
      <span class="mono">© {{ year }} {{ name }} — {{ role }}</span>
      <div class="footer__links">
        <button class="tlink mono" data-cursor @click="legalOpen = true">
          Mentions légales
        </button>
        <a href="#top" class="tlink mono" data-cursor>Retour en haut</a>
      </div>
    </div>
  </footer>

  <LegalModal :open="legalOpen" @close="legalOpen = false" />
</template>

<script setup>
import { ref } from 'vue'
import LegalModal from '../ui/LegalModal.vue'
import aboutData from '../../data/about.json'

const first = aboutData.first
const name = aboutData.name
const role = aboutData.role
const year = new Date().getFullYear()

const legalOpen = ref(false)
</script>
