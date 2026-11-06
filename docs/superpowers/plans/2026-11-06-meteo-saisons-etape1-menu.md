# Météo & saisons — Étape 1 : menu + mode automatique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à côté du bouton jour/nuit un menu saison/météo (manuel + « Automatique » : saison selon la date, météo réelle d'Auch ou locale en opt-in), sans encore d'effet sur la 3D.

**Architecture:** Logique pure (saison par date, codes WMO → état, règles hiver) dans `src/seasonWeather.js`, testée unitairement. Un état réactif injectable `createSeasonWeather(deps)` (stockage, fetch, géoloc, date) dans `src/composables/useSeasonWeather.js`, exposé en singleton par `useSeasonWeather()` à la manière de `useTheme`. Le composant `SeasonWeatherMenu.vue` s'affiche dans la `NavBar` uniquement quand `HeroSection` signale que la 3D tourne. L'étape 2 consommera `effective` (saison + météo effectives).

**Tech Stack:** Vue 3.5 (`<script setup>`), Vite 8, Vitest (nouvelle devDependency, environnement `node`), API Open-Meteo.

**Spec:** `docs/superpowers/specs/2026-11-06-meteo-saisons-design.md`

## Global Constraints

- Commentaires et libellés en français, dans le ton du code existant.
- Saisons météorologiques : déc–fév hiver, mars–mai printemps, juin–août été, sept–nov automne ; décalage de 6 mois dans l'hémisphère sud.
- Coordonnées par défaut : Auch, `{ lat: 43.65, lon: 0.59 }`.
- Position locale : opt-in explicite, arrondie à 0,1° (~10 km), jamais envoyée ailleurs qu'à Open-Meteo, gardée seulement en `sessionStorage`.
- Choix manuels valables pour la visite (`sessionStorage`), saison et météo forçables indépendamment ; « Automatique » efface les deux.
- Hiver : « Pluie » s'affiche « Neige », « Orage » grisé (pas caché) ; orage forcé + hiver → pluie.
- Bouton visible uniquement quand la scène 3D tourne ; aucun appel Open-Meteo sans 3D.
- `sessionStorage` peut lever (navigation privée) : toujours en try/catch, fonctionner en mémoire.
- Ne pas pousser (`git push`) : commits locaux seulement.

Identifiants (utilisés partout, ne pas traduire) :
- saisons : `'printemps' | 'ete' | 'automne' | 'hiver'`
- météos : `'degage' | 'nuageux' | 'pluie' | 'orage'`

## Review Focus

1. Open-Meteo injoignable, lent ou réponse invalide → météo auto = `'degage'`, aucune erreur visible ni exception non gérée (test Task 2 + Task 3).
2. `sessionStorage` qui lève à chaque accès → le menu fonctionne en mémoire (test Task 3).
3. Géolocalisation refusée ou absente → reste sur Auch, `local` repasse à `false` (test Task 3).
4. Orage forcé puis passage en hiver → météo forcée devient `'pluie'` et le reste en revenant en automne (test Task 3).
5. Bornes de dates : 30 nov = automne, 1er déc = hiver, 29 fév = hiver, 1er mars = printemps ; juillet hémisphère sud = hiver (test Task 1).

---

### Task 1: Vitest + logique pure saison/météo

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `src/seasonWeather.js`
- Test: `src/seasonWeather.test.js`

**Interfaces:**
- Produces:
  - `SEASONS: string[]` = `['printemps', 'ete', 'automne', 'hiver']`
  - `WEATHERS: string[]` = `['degage', 'nuageux', 'pluie', 'orage']`
  - `AUCH: { lat: number, lon: number }` = `{ lat: 43.65, lon: 0.59 }`
  - `seasonFromDate(date: Date, south = false): string`
  - `weatherFromCode(code: number): string`
  - `effectiveWeather(season: string, weather: string): string` — `'orage'` en hiver → `'pluie'`, sinon inchangé
  - `weatherLabel(weather: string, season: string): string` — `Dégagé | Nuageux | Pluie | Orage`, et `'Neige'` pour `'pluie'` en hiver
  - `SEASON_LABELS: Record<string,string>` — `Printemps | Été | Automne | Hiver`
  - `roundCoord(v: number): number` — arrondi à 0,1

- [ ] **Step 1: Installer Vitest**

Run: `npm i -D vitest` puis ajouter `"test": "vitest run"` aux scripts.

- [ ] **Step 2: Écrire les tests (échouent)**

```js
import { describe, it, expect } from 'vitest'
import { seasonFromDate, weatherFromCode, effectiveWeather, weatherLabel, roundCoord } from './seasonWeather.js'

describe('seasonFromDate', () => {
  it('suit les saisons météorologiques', () => {
    expect(seasonFromDate(new Date(2026, 10, 30))).toBe('automne')
    expect(seasonFromDate(new Date(2026, 11, 1))).toBe('hiver')
    expect(seasonFromDate(new Date(2028, 1, 29))).toBe('hiver')
    expect(seasonFromDate(new Date(2027, 2, 1))).toBe('printemps')
    expect(seasonFromDate(new Date(2026, 5, 1))).toBe('ete')
  })
  it('décale de 6 mois dans l’hémisphère sud', () => {
    expect(seasonFromDate(new Date(2026, 6, 14), true)).toBe('hiver')
    expect(seasonFromDate(new Date(2026, 0, 10), true)).toBe('ete')
  })
})

describe('weatherFromCode', () => {
  it.each([
    [0, 'degage'], [1, 'degage'], [2, 'nuageux'], [3, 'nuageux'], [45, 'nuageux'], [48, 'nuageux'],
    [51, 'pluie'], [61, 'pluie'], [67, 'pluie'], [71, 'pluie'], [77, 'pluie'], [80, 'pluie'], [86, 'pluie'],
    [95, 'orage'], [96, 'orage'], [99, 'orage'], [12345, 'degage'],
  ])('%i → %s', (code, w) => expect(weatherFromCode(code)).toBe(w))
})

describe('règles d’hiver', () => {
  it('pas d’orage en hiver', () => {
    expect(effectiveWeather('hiver', 'orage')).toBe('pluie')
    expect(effectiveWeather('automne', 'orage')).toBe('orage')
  })
  it('la pluie devient de la neige', () => {
    expect(weatherLabel('pluie', 'hiver')).toBe('Neige')
    expect(weatherLabel('pluie', 'ete')).toBe('Pluie')
    expect(weatherLabel('degage', 'hiver')).toBe('Dégagé')
  })
})

it('roundCoord arrondit à ~10 km', () => {
  expect(roundCoord(43.6468)).toBe(43.6)
  expect(roundCoord(-33.8688)).toBe(-33.9)
})
```

- [ ] **Step 3: Vérifier l'échec** — Run: `npm test` — Expected: FAIL (module introuvable).

- [ ] **Step 4: Implémenter `src/seasonWeather.js`** selon les interfaces ci-dessus. Codes WMO : 0–1 dégagé ; 2, 3, 45, 48 nuageux ; 51–67, 71–77, 80–86 pluie ; 95–99 orage ; tout autre → dégagé. Sud : mois + 6 modulo 12 avant le calcul. `roundCoord` : `Math.round(v * 10) / 10`.

- [ ] **Step 5: Vérifier** — Run: `npm test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/seasonWeather.js src/seasonWeather.test.js
git commit -m "feat(météo): logique saison/météo et tests (vitest)"
```

### Task 2: Client Open-Meteo

**Files:**
- Create: `src/openMeteo.js`
- Test: `src/openMeteo.test.js`

**Interfaces:**
- Consumes: rien.
- Produces: `fetchWeatherCode(lat: number, lon: number, fetchFn = fetch): Promise<number | null>` — GET `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=weather_code`, renvoie `json.current.weather_code`, ou `null` sur erreur réseau, statut non OK, JSON invalide, champ absent, ou délai > 5 s (`AbortSignal.timeout(5000)`). Ne lève jamais.

- [ ] **Step 1: Tests (échouent)**

```js
import { it, expect, vi } from 'vitest'
import { fetchWeatherCode } from './openMeteo.js'

const ok = (body) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

it('renvoie le code météo courant et appelle la bonne URL', async () => {
  const f = ok({ current: { weather_code: 61 } })
  expect(await fetchWeatherCode(43.65, 0.59, f)).toBe(61)
  expect(f.mock.calls[0][0]).toBe(
    'https://api.open-meteo.com/v1/forecast?latitude=43.65&longitude=0.59&current=weather_code'
  )
})
it.each([
  ['réseau', vi.fn().mockRejectedValue(new Error('offline'))],
  ['statut', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })],
  ['champ absent', ok({ current: {} })],
  ['JSON invalide', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError() } })],
])('null sur erreur (%s)', async (_, f) => {
  expect(await fetchWeatherCode(1, 2, f)).toBeNull()
})
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm test` — Expected: FAIL.
- [ ] **Step 3: Implémenter `fetchWeatherCode`** (try/catch global, `typeof code === 'number'`).
- [ ] **Step 4: Vérifier** — Run: `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/openMeteo.js src/openMeteo.test.js && git commit -m "feat(météo): client Open-Meteo sans clé ni cookies"`

### Task 3: État saison/météo (`useSeasonWeather`)

**Files:**
- Create: `src/composables/useSeasonWeather.js`
- Test: `src/composables/useSeasonWeather.test.js`

**Interfaces:**
- Consumes: Task 1 (`seasonFromDate`, `weatherFromCode`, `effectiveWeather`, `roundCoord`, `AUCH`), Task 2 (`fetchWeatherCode`).
- Produces:
  - `createSeasonWeather({ storage, fetchCode, geolocation, now })` → objet (refs Vue) :
    - `manualSeason: Ref<string|null>`, `manualWeather: Ref<string|null>`
    - `autoWeather: Ref<string>` (défaut `'degage'`), `local: Ref<boolean>`
    - `isAuto: ComputedRef<boolean>` — aucun choix forcé
    - `effective: ComputedRef<{ season: string, weather: string }>` — saison forcée ou auto (date + hémisphère), météo forcée ou auto, passée par `effectiveWeather`
    - `setSeason(s)`, `setWeather(w)`, `resetAuto()`
    - `refresh(): Promise<void>` — récupère la météo auto (coords locales ou Auch), cache 30 min
    - `useLocalWeather(): Promise<void>` — opt-in géoloc
  - `scene3dActive: Ref<boolean>` (export module, écrit par `HeroSection`, lu par `NavBar`)
  - `useSeasonWeather()` — singleton créé avec `sessionStorage`, `fetchWeatherCode`, `navigator.geolocation`, `() => new Date()` ; lance `refresh()` la première fois que `scene3dActive` passe à `true` (jamais sinon).
- Clés `sessionStorage` : `sw-season`, `sw-weather`, `sw-coords` (JSON `{lat, lon}` arrondis), `sw-auto` (JSON `{ code, lat, lon, at }`).
- Règles : `setSeason('hiver')` alors que `manualWeather === 'orage'` → `manualWeather = 'pluie'` (persisté). `setWeather('orage')` refusé (no-op) si la saison effective est l'hiver. `useLocalWeather` : `getCurrentPosition` → arrondi → `local = true` → stocke `sw-coords` → `refresh()` en ignorant le cache ; refus/erreur/absence d'API → `local = false`, rien d'autre. Hémisphère sud seulement si coords locales avec `lat < 0`. Chaque accès au stockage en try/catch.

- [ ] **Step 1: Tests (échouent)** — doubles : `memStorage()` (Map avec `getItem/setItem/removeItem`), `throwingStorage` (chaque méthode lève), `fetchCode = vi.fn()`, `geolocation = { getCurrentPosition: (ok, err) => … }`, `now = () => new Date(2026, 10, 6)`.

```js
it('auto par défaut : automne (6 nov.) et dégagé avant réponse', …)
  // effective.value → { season: 'automne', weather: 'degage' }, isAuto true
it('refresh interroge Auch et applique le code', …)
  // fetchCode résout 95 → fetchCode appelé avec (43.65, 0.59) ; autoWeather 'orage'
it('API injoignable → reste dégagé', …)
  // fetchCode résout null → autoWeather 'degage', pas d'exception
it('cache 30 min : pas de 2e appel', …)
  // deux refresh() même storage, now inchangé → fetchCode appelé 1 fois
it('choix manuels indépendants et persistés pour la visite', …)
  // setSeason('ete') → effective.season 'ete', weather toujours auto ; storage 'sw-season' = 'ete'
  // nouvelle instance sur le même storage → manualSeason 'ete'
it('resetAuto efface les deux choix', …)
it('orage forcé puis hiver → pluie, et le reste au retour en automne', …)
  // setWeather('orage'); setSeason('hiver') → manualWeather 'pluie'; setSeason('automne') → effective.weather 'pluie'
it('orage refusé en hiver', …)
  // setSeason('hiver'); setWeather('orage') → manualWeather null
it('stockage qui lève → fonctionne en mémoire', …)
  // throwingStorage : setSeason('hiver') → effective.season 'hiver', pas d'exception
it('météo locale acceptée : coords arrondies, cache ignoré', …)
  // position {latitude: -33.8688, longitude: 151.2093} → fetchCode(-33.9, 151.2) ; local true ; season 'printemps' (6 nov. sud)
it('météo locale refusée → Auch, local false', …)
  // err callback → local false ; fetchCode jamais appelé par useLocalWeather
it('pas de géolocalisation disponible → local false', …)
  // geolocation undefined
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm test` — Expected: FAIL.
- [ ] **Step 3: Implémenter `src/composables/useSeasonWeather.js`** (refs + computed Vue ; `useSeasonWeather` crée le singleton au premier appel et pose un `watch(scene3dActive, …, { immediate: true })` qui appelle `refresh()` une seule fois quand il devient `true`).
- [ ] **Step 4: Vérifier** — Run: `npm test` — Expected: PASS (tous les fichiers).
- [ ] **Step 5: Commit** — `git add src/composables/useSeasonWeather.js src/composables/useSeasonWeather.test.js && git commit -m "feat(météo): état saison/météo automatique ou forcé pour la visite"`

### Task 4: Menu dans la barre de navigation

**Files:**
- Create: `src/components/ui/SeasonWeatherMenu.vue`
- Modify: `src/components/ui/SvgIcon.vue` (icônes `flower`, `tree`, `leaf`, `snowflake`, `cloud`, `cloud-rain`, `cloud-bolt`, `sliders` ; `sun` existe déjà)
- Modify: `src/components/layout/NavBar.vue` (menu juste avant `.theme-toggle`, `v-if="scene3dActive"`)
- Modify: `src/components/sections/HeroSection.vue` (`scene3dActive.value = true` là où `is3D.value = true` ; `false` dans `teardown3D`)
- Modify: `src/style.css` (styles du bouton et du panneau, après le bloc `.theme-toggle`, ~l.457 ; réutiliser les jetons `--line`, `--panel`, `--green`, `--ink`, `--muted`, `--mono`)
- Modify: `src/data/legal.json` (section « 4. Données personnelles et cookies »)

**Interfaces:**
- Consumes: Task 3 (`useSeasonWeather()`, `scene3dActive`), Task 1 (`SEASONS`, `WEATHERS`, `SEASON_LABELS`, `weatherLabel`).

Comportement (maquette retenue « B », cf. spec) :
- Bouton rond 38 px (30 px sous 900 px n'arrive pas : caché), même style que `.theme-toggle`, icône `sliders`, `aria-label="Saison et météo"`, `aria-expanded`, `aria-controls`.
- Panneau sous le bouton, aligné à droite, largeur ~240 px, fond `--panel` translucide + `backdrop-filter`, ombre `--shadow`. Rangée « Saison » (4 boutons icône + libellé), rangée « Météo » (4 boutons ; pluie → icône `snowflake` + « Neige » en hiver ; orage `disabled` + `title="Pas d'orage en hiver"` en hiver). Bouton actif = `aria-pressed="true"`, fond `--green`, texte `--on-green` ; l'actif reflète `effective`.
- Pied : bouton « Automatique » (`aria-pressed` = `isAuto`) qui appelle `resetAuto()` ; bouton « Ma météo locale » (`aria-pressed` = `local`) qui appelle `useLocalWeather()` ; petite ligne `--muted` : « Météo : Auch » ou « Météo : locale ».
- Fermeture : clic hors du menu, touche Échap (focus rendu au bouton).
- Libellés depuis Task 1, aucune chaîne de saison/météo en dur ailleurs.
- legal.json : ajouter le paragraphe « La scène 3D peut afficher la météo réelle via le service Open-Meteo (open-meteo.com), interrogé directement par votre navigateur, sans cookie. Par défaut, la météo est celle d'Auch. Si vous cliquez sur « Ma météo locale » et l'acceptez, votre position, arrondie à environ 10 km, n'est transmise qu'à Open-Meteo ; elle n'est ni envoyée à ce site ni conservée après votre visite. »

- [ ] **Step 1: Implémenter** composant, icônes, intégration NavBar/Hero, styles, mention légale.
- [ ] **Step 2: Vérifier le build** — Run: `npm run build && npm test` — Expected: build OK, tests PASS.
- [ ] **Step 3: Vérifier dans le navigateur** — `npm run dev`, fenêtre desktop > 900 px : bouton présent à côté du jour/nuit une fois la 3D chargée ; ouvrir le panneau ; choisir Hiver → « Neige » + Orage grisé ; Automatique → retour date/météo ; DevTools onglet réseau : une seule requête `api.open-meteo.com` ; fenêtre ≤ 900 px + rechargement : pas de bouton, aucune requête Open-Meteo ; Échap ferme le panneau.
- [ ] **Step 4: Commit** — `git add src/components src/style.css src/data/legal.json && git commit -m "feat(météo): menu saison/météo à côté du jour/nuit"`
