<template>
  <section id="contact" class="contact section-pad reveal">
    <div class="contact__glow"></div>
    <div class="wrap" style="position: relative; z-index: 2">
      <span class="kicker">Contact</span>
      <h2 class="contact__title">
        <span class="ln"><span class="wd">Travaillons</span></span>
        <span class="ln l2"><span class="wd mark">ensemble.</span></span>
      </h2>

      <p class="contact__lede reveal" data-d="2">{{ contactLede }}</p>

      <div class="contact__actions reveal" data-d="3">
        <a class="btn btn--solid" :href="`mailto:${email}`" data-cursor="écrire">
          <SvgIcon name="mail" /> {{ email }}
        </a>
        <button class="btn" :class="{ copied }" data-cursor @click="copy">
          <SvgIcon name="copy" /> {{ copied ? 'Adresse copiée' : "Copier l'adresse" }}
        </button>
      </div>

      <div class="socials reveal" data-d="4">
        <a
          class="social"
          :href="github"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          data-cursor
        >
          <SvgIcon name="code" />
        </a>
        <a
          class="social"
          :href="linkedin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          data-cursor
        >
          <SvgIcon name="linkedin" />
        </a>
        <a class="social" :href="`mailto:${email}`" aria-label="Email" data-cursor>
          <SvgIcon name="mail" />
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import SvgIcon from '../ui/SvgIcon.vue'
import aboutData from '../../data/about.json'

const email = aboutData.email
const github = aboutData.github
const linkedin = aboutData.linkedin
const contactLede = aboutData.contactLede

const copied = ref(false)
let timer = null

async function copy() {
  try {
    await navigator.clipboard.writeText(email)
  } catch (e) {
    /* noop */
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, 1800)
}
</script>
