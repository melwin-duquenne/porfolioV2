// Saisons et météo de la scène 3D : règles pures, sans état ni accès réseau.
// Identifiants : saisons 'printemps' | 'ete' | 'automne' | 'hiver',
// météos 'degage' | 'nuageux' | 'pluie' | 'orage'.

export const SEASONS = ['printemps', 'ete', 'automne', 'hiver']
export const WEATHERS = ['degage', 'nuageux', 'pluie', 'orage']

export const SEASON_LABELS = { printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' }
const WEATHER_LABELS = { degage: 'Dégagé', nuageux: 'Nuageux', pluie: 'Pluie', orage: 'Orage' }

// Météo par défaut : Auch (Gers)
export const AUCH = { lat: 43.65, lon: 0.59 }

// Saisons météorologiques (par mois) ; dans l'hémisphère sud, décalées de 6 mois.
const BY_MONTH = [
  'hiver', 'hiver', // janv., févr.
  'printemps', 'printemps', 'printemps',
  'ete', 'ete', 'ete',
  'automne', 'automne', 'automne',
  'hiver', // déc.
]
export function seasonFromDate(date, south = false) {
  const month = (date.getMonth() + (south ? 6 : 0)) % 12
  return BY_MONTH[month]
}

// Codes météo WMO (Open-Meteo) → nos quatre états. Inconnu → dégagé.
export function weatherFromCode(code) {
  if (code === 0 || code === 1) return 'degage'
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'nuageux'
  if ((code >= 51 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 86)) return 'pluie'
  if (code >= 95 && code <= 99) return 'orage'
  return 'degage'
}

// Pas d'orage en hiver : il devient de simples précipitations (de la neige)
export const effectiveWeather = (season, weather) =>
  season === 'hiver' && weather === 'orage' ? 'pluie' : weather

export const weatherLabel = (weather, season) =>
  season === 'hiver' && weather === 'pluie' ? 'Neige' : WEATHER_LABELS[weather]

// ~10 km : assez pour la météo, trop flou pour situer quelqu'un
export const roundCoord = (v) => Math.round(v * 10) / 10

// ---------- rendu de la météo dans la 3D ----------
// Aspect cible de chaque météo, entre 0 et 1 : `cover` couverture nuageuse (nuages
// bas sur les sommets), `shade` noirceur des nuages (blanc → gris → quasi noir),
// `dim` assombrissement de la scène, `haze` brouillard plus proche, `precip`
// quantité de pluie (ou de neige en hiver). La scène y glisse progressivement.
export const WEATHER_LOOK = {
  degage: { cover: 0, shade: 0, dim: 0, haze: 0, precip: 0 },
  nuageux: { cover: 1, shade: 0.08, dim: 0.12, haze: 0.25, precip: 0 },
  pluie: { cover: 1, shade: 0.6, dim: 0.45, haze: 0.55, precip: 0.7 },
  orage: { cover: 1, shade: 0.95, dim: 0.65, haze: 0.7, precip: 1 },
}

// Voile posé sur le ciel CSS du hero ([couleur, opacité]), de jour et de nuit.
// La scène mélange la même couleur à son brouillard pour qu'il s'y fonde.
export const SKY_VEIL = {
  degage: { day: ['#ffffff', 0], night: ['#000000', 0] },
  nuageux: { day: ['#e4e8ea', 0.45], night: ['#1e252e', 0.35] },
  pluie: { day: ['#6b747c', 0.6], night: ['#141a20', 0.55] },
  orage: { day: ['#2b3238', 0.8], night: ['#07090c', 0.75] },
}

// Qui est dehors selon la météo (déjà effective : pas d'orage en hiver).
// `hikers` : part des randonneurs encore en balade ; `campFire` : le soir, feu
// et campeurs dehors (sinon tous à l'abri dans les tentes, feu éteint).
export function crowd(season, weather) {
  if (weather === 'orage') {
    return { hikers: 0, umbrellas: false, paragliders: false, birds: false, fireflies: false, fisher: false, campFire: false }
  }
  if (weather === 'pluie') {
    return {
      hikers: 0.35,
      umbrellas: season !== 'hiver', // la neige, on la prend sans parapluie
      paragliders: false,
      birds: false,
      fireflies: false,
      fisher: true,
      campFire: false,
    }
  }
  return { hikers: 1, umbrellas: false, paragliders: true, birds: true, fireflies: true, fisher: true, campFire: true }
}

// Rapproche `current` de `target` d'un pas de dt / duration, sans dépasser
export function approach(current, target, dt, duration) {
  const step = dt / duration
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step)
}
