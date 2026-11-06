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
