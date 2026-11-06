<template>
  <div ref="root" class="sw">
    <button
      ref="toggleBtn"
      type="button"
      class="theme-toggle sw__toggle"
      data-cursor
      aria-label="Saison et météo"
      title="Saison et météo"
      :aria-expanded="open"
      aria-controls="sw-panel"
      @click="open = !open"
    >
      <SvgIcon name="sliders" class="theme-toggle__icon sw__icon" />
    </button>

    <div v-show="open" id="sw-panel" class="sw__panel" role="group" aria-label="Saison et météo">
      <p class="sw__label">Saison</p>
      <div class="sw__row">
        <button
          v-for="s in SEASONS"
          :key="s"
          type="button"
          class="sw__chip"
          data-cursor
          :aria-pressed="effective.season === s"
          @click="setSeason(s)"
        >
          <SvgIcon :name="SEASON_ICONS[s]" class="sw__chip-icon" />
          {{ SEASON_LABELS[s] }}
        </button>
      </div>

      <p class="sw__label">Météo</p>
      <div class="sw__row">
        <button
          v-for="w in WEATHERS"
          :key="w"
          type="button"
          class="sw__chip"
          data-cursor
          :aria-pressed="effective.weather === w"
          :disabled="winter && w === 'orage'"
          :title="winter && w === 'orage' ? `Pas d'orage en hiver` : undefined"
          @click="setWeather(w)"
        >
          <SvgIcon :name="weatherIcon(w)" class="sw__chip-icon" />
          {{ weatherLabel(w, effective.season) }}
        </button>
      </div>

      <div class="sw__foot">
        <button type="button" class="sw__pill" data-cursor :aria-pressed="isAuto" @click="resetAuto">
          Automatique
        </button>
        <button type="button" class="sw__pill" data-cursor :aria-pressed="local" @click="useLocalWeather">
          Ma météo locale
        </button>
      </div>
      <p class="sw__source">Météo : {{ local ? 'locale' : 'Auch' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { SEASONS, WEATHERS, SEASON_LABELS, weatherLabel } from '../../seasonWeather.js'
import { useSeasonWeather } from '../../composables/useSeasonWeather.js'

const { effective, isAuto, local, setSeason, setWeather, resetAuto, useLocalWeather } = useSeasonWeather()

const SEASON_ICONS = { printemps: 'flower', ete: 'tree', automne: 'leaf', hiver: 'snowflake' }
const WEATHER_ICONS = { degage: 'sun', nuageux: 'cloud', pluie: 'cloud-rain', orage: 'cloud-bolt' }

const winter = computed(() => effective.value.season === 'hiver')
// en hiver la pluie est de la neige
const weatherIcon = (w) => (winter.value && w === 'pluie' ? 'snowflake' : WEATHER_ICONS[w])

// ---------- ouverture / fermeture ----------
const open = ref(false)
const root = ref(null)
const toggleBtn = ref(null)

const onPointerDown = (e) => {
  if (!root.value?.contains(e.target)) open.value = false
}
const onKey = (e) => {
  if (e.key !== 'Escape') return
  open.value = false
  toggleBtn.value?.focus()
}
// écouteurs posés seulement panneau ouvert
watch(open, (on) => {
  const method = on ? 'addEventListener' : 'removeEventListener'
  document[method]('pointerdown', onPointerDown)
  document[method]('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKey)
})
</script>
