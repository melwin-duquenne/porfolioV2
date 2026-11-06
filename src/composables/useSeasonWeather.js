import { ref, computed, watch } from 'vue'
import {
  SEASONS,
  WEATHERS,
  AUCH,
  seasonFromDate,
  weatherFromCode,
  effectiveWeather,
  roundCoord,
} from '../seasonWeather.js'
import { fetchWeatherCode } from '../openMeteo.js'

// Saison et météo de la scène 3D. Par défaut tout est automatique : saison selon
// la date, météo réelle d'Auch (ou du visiteur s'il clique sur « Ma météo
// locale » et l'accepte). Un choix dans le menu force la saison et/ou la météo
// pour la visite seulement (sessionStorage), comme le bouton jour/nuit.

const KEYS = { season: 'sw-season', weather: 'sw-weather', coords: 'sw-coords', auto: 'sw-auto' }
const CACHE_MS = 30 * 60 * 1000 // une requête météo par demi-heure au plus

// la 3D tourne-t-elle ? Posé par HeroSection, lu par la barre de navigation :
// sans 3D, pas de menu ni d'appel météo
export const scene3dActive = ref(false)

/**
 * État saison/météo, avec ses dépendances injectées (testable hors navigateur).
 * `storage` : type sessionStorage (peut lever) ; `fetchCode(lat, lon)` : code WMO
 * ou null ; `geolocation` : type navigator.geolocation (peut être absent) ;
 * `now()` : date courante.
 */
export function createSeasonWeather({ storage, fetchCode, geolocation, now }) {
  // le stockage peut être refusé (navigation privée…) : on travaille alors en mémoire
  const read = (key) => {
    try {
      return storage?.getItem(key) ?? null
    } catch (e) {
      return null
    }
  }
  const write = (key, value) => {
    try {
      if (value == null) storage?.removeItem(key)
      else storage?.setItem(key, value)
    } catch (e) {
      // tant pis : le choix vaut pour cette page
    }
  }
  const readJSON = (key) => {
    try {
      return JSON.parse(read(key))
    } catch (e) {
      return null
    }
  }
  const valid = (list, v) => (list.includes(v) ? v : null)

  const manualSeason = ref(valid(SEASONS, read(KEYS.season)))
  const manualWeather = ref(valid(WEATHERS, read(KEYS.weather)))
  const coords = ref(readJSON(KEYS.coords)) // position locale arrondie, ou null (Auch)
  const local = ref(coords.value != null)
  const autoWeather = ref('degage')

  const autoSeason = () => seasonFromDate(now(), local.value && coords.value.lat < 0)
  const season = computed(() => manualSeason.value ?? autoSeason())
  const isAuto = computed(() => manualSeason.value == null && manualWeather.value == null)
  const effective = computed(() => ({
    season: season.value,
    weather: effectiveWeather(season.value, manualWeather.value ?? autoWeather.value),
  }))

  function setSeason(s) {
    manualSeason.value = s
    write(KEYS.season, s)
    // pas d'orage en hiver : l'orage forcé devient de la neige, et le reste
    if (s === 'hiver' && manualWeather.value === 'orage') setWeather('pluie')
  }
  function setWeather(w) {
    if (w === 'orage' && season.value === 'hiver') return
    manualWeather.value = w
    write(KEYS.weather, w)
  }
  function resetAuto() {
    manualSeason.value = manualWeather.value = null
    write(KEYS.season, null)
    write(KEYS.weather, null)
  }

  // météo auto : coordonnées locales ou Auch ; réponse gardée 30 min pour la visite
  async function refresh({ force = false } = {}) {
    const { lat, lon } = coords.value ?? AUCH
    const t = now().getTime()
    const cached = readJSON(KEYS.auto)
    if (!force && cached && cached.lat === lat && cached.lon === lon && t - cached.at < CACHE_MS) {
      autoWeather.value = weatherFromCode(cached.code)
      return
    }
    const code = await fetchCode(lat, lon)
    if (code == null) return // indisponible : on garde ce qu'on a (dégagé par défaut)
    // entre-temps, le visiteur a pu passer en météo locale : réponse périmée
    const current = coords.value ?? AUCH
    if (current.lat !== lat || current.lon !== lon) return
    autoWeather.value = weatherFromCode(code)
    write(KEYS.auto, JSON.stringify({ code, lat, lon, at: t }))
  }

  // opt-in : position du navigateur (avec son autorisation), arrondie à ~10 km
  async function useLocalWeather() {
    const position = await new Promise((resolve) => {
      if (!geolocation?.getCurrentPosition) return resolve(null)
      geolocation.getCurrentPosition(resolve, () => resolve(null), { maximumAge: CACHE_MS, timeout: 10000 })
    })
    // refus, délai dépassé, pas d'API : rien ne change (Auch, ou la position
    // locale déjà acceptée plus tôt dans la visite)
    if (!position) return
    coords.value = { lat: roundCoord(position.coords.latitude), lon: roundCoord(position.coords.longitude) }
    local.value = true
    write(KEYS.coords, JSON.stringify(coords.value))
    await refresh({ force: true })
  }

  return {
    manualSeason,
    manualWeather,
    autoWeather,
    local,
    isAuto,
    effective,
    setSeason,
    setWeather,
    resetAuto,
    refresh,
    useLocalWeather,
  }
}

let instance = null
const sessionStore = () => {
  try {
    return window.sessionStorage
  } catch (e) {
    return null
  }
}

// État partagé de l'application ; la météo n'est demandée qu'une fois la 3D lancée
export function useSeasonWeather() {
  if (!instance) {
    instance = createSeasonWeather({
      storage: sessionStore(),
      fetchCode: fetchWeatherCode,
      geolocation: navigator.geolocation,
      now: () => new Date(),
    })
    let asked = false
    watch(
      scene3dActive,
      (on) => {
        if (!on || asked) return
        asked = true
        instance.refresh()
      },
      { immediate: true }
    )
  }
  return instance
}
