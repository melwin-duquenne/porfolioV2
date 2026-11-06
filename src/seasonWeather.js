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

// L'hiver, un voile blanc bleuté de plus sous celui de la météo : sans lui, le
// ciel et la brume gardent la teinte verte du thème et le paysage enneigé verdit.
const WINTER_VEIL = { day: ['#eef3f6', 0.4], night: ['#1c2633', 0.25] }
const hexRGB = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const rgbHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

// Voile final [couleur, opacité] posé sur le ciel CSS (et mélangé à la brume 3D) :
// celui de la météo, posé sur celui de l'hiver le cas échéant (composition en sRGB).
export function skyVeil(season, weather, night) {
  const key = night ? 'night' : 'day'
  const top = SKY_VEIL[weather][key]
  if (season !== 'hiver') return top
  const [under, au] = WINTER_VEIL[key]
  const [over, ao] = top
  if (!ao) return WINTER_VEIL[key]
  const alpha = 1 - (1 - au) * (1 - ao)
  const a = hexRGB(over)
  const b = hexRGB(under)
  return [rgbHex(a.map((v, i) => (v * ao + b[i] * au * (1 - ao)) / alpha)), alpha]
}

// Qui est dehors selon la météo (déjà effective : pas d'orage en hiver).
// `hikers` : part des randonneurs encore en balade ; `campFire` : le soir, feu
// et campeurs dehors (sinon tous à l'abri dans les tentes, feu éteint).
// `skiers` / `skaters` : part des skieurs et des patineurs (l'hiver seulement).
export function crowd(season, weather) {
  const winter = season === 'hiver'
  if (weather === 'orage') {
    return {
      hikers: 0, umbrellas: false, paragliders: false, birds: false, fireflies: false, fisher: false, campFire: false,
      skiers: 0, skaters: 0,
    }
  }
  if (weather === 'pluie') {
    return {
      hikers: 0.35,
      umbrellas: !winter, // la neige, on la prend sans parapluie
      paragliders: false,
      birds: false,
      fireflies: false,
      fisher: !winter, // lac gelé : plus de pêcheur
      campFire: false,
      skiers: winter ? 0.5 : 0, // quelques skieurs continuent sous la neige
      skaters: winter ? 0.5 : 0,
    }
  }
  return {
    hikers: 1,
    umbrellas: false,
    paragliders: !winter, // l'hiver, des skieurs à la place
    birds: true,
    fireflies: !winter,
    fisher: !winter,
    campFire: true,
    skiers: winter ? 1 : 0,
    skaters: winter ? 1 : 0,
  }
}

// Rapproche `current` de `target` d'un pas de dt / duration, sans dépasser
export function approach(current, target, dt, duration) {
  const step = dt / duration
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step)
}

// ---------- rendu des saisons dans la 3D ----------
// Aspect de chaque saison : `grass` teinte de l'herbe des prairies, `crowns`
// palette des feuillus (chaque arbre y pioche selon son tirage), `blossom`
// feuillage de l'arbre près du chalet ; quantités 0..1 : `flowers` fleurs des
// prairies, `fallen` feuilles mortes au sol, `falling` feuilles qui tombent,
// `pumpkins` citrouilles autour du chalet, `snow` neige (sol, toits, tentes,
// sapins, bonnets), `ice` lac gelé, `decor` décor d'hiver ; `crownSize` taille
// des houppiers (arbres nus l'hiver). La scène y glisse progressivement.
const SUMMER = {
  grass: '#6f9a68',
  crowns: ['#3f7a45', '#4a8048', '#356c3e', '#5a8a4a'],
  blossom: '#4f8a48',
  flowers: 0,
  fallen: 0,
  falling: 0,
  pumpkins: 0,
  snow: 0,
  ice: 0,
  crownSize: 1,
  decor: 0,
}
export const SEASON_LOOK = {
  printemps: {
    ...SUMMER,
    grass: '#86b862',
    crowns: ['#7fb35a', '#8cbf5f', '#6fa651', '#9ac76a'],
    blossom: '#f3a9c4',
    flowers: 1,
  },
  ete: SUMMER,
  automne: {
    ...SUMMER,
    grass: '#8f9a5a',
    crowns: ['#e3b23c', '#d98a2b', '#c9622a', '#a8431f', '#d9a13a'], // jaune → roux
    blossom: '#b8501f',
    fallen: 1,
    falling: 1,
    pumpkins: 1,
  },
  hiver: {
    ...SUMMER,
    crowns: ['#e9eef0', '#dfe5e8', '#cfd6da', '#b9b2a8'], // branches nues saupoudrées
    blossom: '#e6ecef',
    snow: 1,
    ice: 1,
    crownSize: 0.55,
    decor: 1,
  },
}

// Couleur du feuillu de tirage `v` (∈ [0, 1[) pour cette saison
export function crownColor(season, v) {
  const { crowns } = SEASON_LOOK[season]
  return crowns[Math.floor(v * crowns.length)]
}

// Progression (0..1) d'un élément de tirage `r` quand l'ensemble en est à
// `amount` : les petits tirages partent d'abord, tous ont fini à amount = 1.
export function stagger(amount, r, spread = 0.5) {
  return Math.min(1, Math.max(0, (amount - r * spread) / (1 - spread)))
}
