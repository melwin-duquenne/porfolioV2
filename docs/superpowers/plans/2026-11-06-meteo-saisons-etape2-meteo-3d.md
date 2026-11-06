# Météo & saisons — Étape 2 : la météo dans la 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire vivre dans la scène 3D les quatre météos choisies par le menu de l'étape 1 (nuages, pluie/neige qui tombe, orage avec éclairs, personnages qui s'adaptent), avec des transitions animées de jour comme de nuit.

**Architecture:** Les règles « qui est dehors / quel aspect » sont pures dans `src/seasonWeather.js` (testées). La scène expose `setWeather({ season, weather })` ; elle interpole un petit état continu (`cover`, `shade`, `dim`, `haze`, `precip`) vers les valeurs cibles en `WEATHER_DURATION` s et l'applique aux lumières, au brouillard, aux nuages, aux précipitations et aux personnages. `HeroSection` relie `useSeasonWeather().effective` à la scène et pose sur le hero les variables CSS du voile de ciel (et du flash d'éclair).

**Tech Stack:** Three.js 0.186, Vue 3.5, Vitest. Vérification visuelle par captures headless (Chrome + `?debug3d`, dev uniquement).

**Spec:** `docs/superpowers/specs/2026-11-06-meteo-saisons-design.md` (section « Météo dans la 3D (étape 2) »)

## Global Constraints

- Tableau du spec : Dégagé = peu/pas de nuages ; Nuageux = beaucoup de nuages **blancs**, bas, qui **cachent les sommets** ; Pluie = mêmes nuages **gris sombre**, pluie, scène plus sombre, **moins de personnages avec parapluies**, **pas de parapentes** ; Orage = nuages **quasi noirs**, pluie, **éclairs**, encore plus sombre, **personne dehors** (randonneurs, pêcheur, parapentes) et la nuit **tentes montées sans feu**, campeurs à l'abri.
- Pluie de nuit (et neige qui tombe en hiver) : camps comme l'orage (tentes, feu éteint, campeurs à l'abri).
- Hiver : précipitations = neige (pas de parapluie), quelques personnages restent.
- Fumée de la cheminée conservée dans toutes les météos.
- Pas de « pop » : ce qui apparaît/disparaît passe par une transition.
- Échelle réaliste (personnage debout ≈ 0,45 unité ; parapluie ≈ 0,4 de diamètre).
- Performances : un appel de dessin par système de particules ; pas de lumière ajoutée/retirée dynamiquement (recompilation des shaders).
- Le ciel CSS du hero suit la météo ; le reste de la page non.
- Commentaires en français ; ne pas pousser.

## Review Focus

1. Changer de météo plusieurs fois rapidement (pendant une transition) → pas de saut, la scène repart de l'état courant (test Task 1 `approach`).
2. Bascule jour/nuit pendant une météo → le voile et le brouillard restent cohérents avec le ciel CSS (vérif. captures Task 2, jour et nuit).
3. Orage → hiver : pas d'éclairs, neige (couvert par `effectiveWeather`, test Task 1 `crowd('hiver','pluie')`).
4. Scène arrêtée (hero hors écran) puis météo changée → appliquée tout de suite au retour, comme `setNight` (Task 2).
5. Météo reçue avant la fin de la construction de la scène → appliquée dès sa création (Task 2, `HeroSection` appelle `setWeather` après `setNight`).

---

### Task 1: Règles pures météo → aspect et présence

**Files:** Modify `src/seasonWeather.js` ; Test `src/seasonWeather.test.js`

**Interfaces — Produces:**
- `WEATHER_LOOK: Record<weather, { cover, shade, dim, haze, precip }>` (0..1) :
  `degage {0,0,0,0,0}`, `nuageux {1,0.08,0.12,0.25,0}`, `pluie {1,0.6,0.35,0.45,0.7}`, `orage {1,0.95,0.55,0.55,1}`.
- `SKY_VEIL: Record<weather, { day: [color, alpha], night: [color, alpha] }>` — voile posé sur le ciel CSS et mélangé au brouillard :
  degage `['#ffffff',0]`/`['#000000',0]` ; nuageux `['#e4e8ea',0.45]`/`['#1e252e',0.35]` ; pluie `['#6b747c',0.6]`/`['#141a20',0.55]` ; orage `['#2b3238',0.8]`/`['#07090c',0.75]`.
- `crowd(season, weather) → { hikers: number, umbrellas: boolean, paragliders: boolean, birds: boolean, fireflies: boolean, fisher: boolean, campFire: boolean }` :
  degage/nuageux → `{1, false, true, true, true, true, true}` ; pluie → `{0.35, season !== 'hiver', false, false, false, true, false}` ; orage → `{0, false, false, false, false, false, false}`. L'appelant passe la météo **effective** (orage déjà ramené à pluie en hiver).
- `approach(current, target, dt, duration) → number` — avance linéairement de `dt / duration` (par unité d'écart 1) vers la cible sans la dépasser.

- [ ] **Step 1: Tests (échouent)** — `crowd` pour les 4 météos + `crowd('hiver','pluie').umbrellas === false` ; `approach(0,1,0.5,2) === 0.25`, `approach(0.9,1,1,2) === 1`, `approach(1,0,0.5,2) === 0.75`, `approach(0.3,0.3,1,2) === 0.3` ; chaque clé de `WEATHER_LOOK` et `SKY_VEIL` couvre les 4 météos.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implémenter. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(météo): règles d'aspect et de présence par météo`

### Task 2: Ciel couvert — lumière, brouillard, voile CSS, nuages bas

**Files:** Modify `src/three/mountainScene.js`, `src/three/ambient.js` (`buildClouds` : textures partagées + `update(k, t, shade)` ; nouveau `buildCloudBank()`), `src/components/sections/HeroSection.vue`, `src/style.css` (`.hero__sky::after` voile, `::before` flash). Dev : flag `?debug3d` déjà ajouté dans `HeroSection` (force la 3D, sans repli).

**Interfaces:**
- Scene Produces : `setWeather({ season, weather })` (immédiat si la boucle ne tourne pas) ; option `createMountainScene(canvas, { onSlow, onFlash })` où `onFlash(intensity: 0..1)` est appelé à chaque image pendant un éclair (utilisé Task 3).
- `buildCloudBank() → { object, update(t, cover, shade, k) }` — ~16 sprites **dans le monde** (pas dans le groupe ciel), autour des sommets (x −90..90, y 26..46, z −45..−100), larges (35–60), dérive lente ; opacité = `cover * 0.9`, couleur blanc → `#6b737b` → `#23282d` selon `shade`, assombrie la nuit ; `visible = cover > 0`.
- `WEATHER_DURATION = 3` (s) ; CSS du voile en transition 3 s.
- Application : lumières × `(1 - dim)` ; brouillard : couleur = ciel (jour/nuit) mélangée au voile `SKY_VEIL` (même couleur/alpha que le CSS), `near/far` réduits de `haze` (far 210 → ~120 à haze 1) ; nuages du ciel : couleur selon `shade`.
- HeroSection : `watch(effective)` → `scene3d?.setWeather(effective)` ; variables `--wx-veil` (couleur) et `--wx-veil-a` (alpha) sur `.hero` selon `SKY_VEIL[weather][isDark ? 'night' : 'day']`, aussi quand la 3D n'est pas là (inutile mais sans effet : le bouton est caché) — **ruling** : seulement si `is3D`.

- [ ] **Step 1:** implémenter. **Step 2:** `npm run build && npm test` OK.
- [ ] **Step 3: Captures** jour + nuit × degage / nuageux / pluie / orage (choix via le menu) : sommets cachés en nuageux, scène nettement plus sombre en orage, brouillard fondu dans le ciel sans bande.
- [ ] **Step 4: Commit** `feat(3d): ciel couvert, nuages bas et assombrissement selon la météo`

### Task 3: Pluie, neige qui tombe, éclairs

**Files:** Modify `src/three/ambient.js` (`buildPrecipitation()`, `buildLightning()`), `src/three/mountainScene.js`, `src/components/sections/HeroSection.vue`, `src/style.css`.

**Interfaces:**
- `buildPrecipitation() → { object, update(dt, amount, snow) }` — pluie : `LineSegments` (~1500 gouttes, longueur ~0.8, chute ~28 u/s, légère inclinaison vent) ; neige : `Points` (~1200 flocons, ~1.5 u/s, dérive sinusoïdale). Volume fixe dans le monde entre la caméra et la vallée (x −45..45, y 0..40, z −30..70), recyclage en haut. `amount` règle `drawRange` (pas de pop : densité progressive). `snow = season === 'hiver'`.
- `buildLightning() → { object, update(dt, active, k) → flash: number }` — si `active`, éclair toutes les 4–11 s : double flash (~0.12 s + ~0.08 s), éclair en zigzag (ligne, `fog:false`) dans le ciel lointain visible le temps du flash. Retourne l'intensité 0..1 du flash.
- Scène : flash → lumière hémisphérique + brouillard éclaircis brièvement, et `onFlash(flash)` ; `HeroSection` pose `--wx-flash` sur `.hero` (`.hero__sky::before` blanc bleuté, opacité `var(--wx-flash)`, sans transition).

- [ ] **Step 1:** implémenter. **Step 2:** `npm run build && npm test` OK.
- [ ] **Step 3: Captures** pluie (jour/nuit), neige (hiver + Neige), orage pendant un flash (attendre/forcer via `?debug3d` en attente suffisante).
- [ ] **Step 4: Commit** `feat(3d): pluie, neige qui tombe et éclairs d'orage`

### Task 4: Personnages selon la météo

**Files:** Modify `src/three/mountainScene.js` (randonneurs, pêcheur, camps, câblage), `src/three/ambient.js` (rien de neuf pour parapentes : `update(day && crowd.paragliders, …)`).

**Interfaces:**
- Randonneurs : `setCrowd({ hikers, umbrellas })` ; chaque randonneur a un tirage fixe `r` ∈ [0,1[ ; présent si `r < hikers`. Présence animée (≈1,2 s, décalée par `r`) : en partant il **rapetisse en s'enfonçant** (échelle et hauteur), en revenant l'inverse. Parapluies : 2 `InstancedMesh` (toile conique Ø≈0,4 à hauteur ≈0,62 × échelle de zone, couleurs variées ; manche fin), ouverture animée (échelle 0→1) quand `umbrellas`.
- Pêcheur : présence animée de la même façon (`crowd.fisher`), parapluie enfant du pêcheur (hors fusion `mergeStatic`) ouvert si `umbrellas`.
- Parapentes : `paragliders.update(day && crowd.paragliders, t, dt)` (départ en vol plané / arrivée en chute libre déjà animés).
- Oiseaux, lucioles : visibles seulement si `crowd.birds` / `crowd.fireflies` (en plus du jour/nuit) — **ruling** : bascule sans fondu (petits, lointains).
- Camps : `camps.setShelter(on)` avec `on = !crowd.campFire` ; abri animé (≈2,5 s) : les campeurs se lèvent, marchent jusqu'à l'entrée d'une tente de leur camp et y disparaissent ; le feu s'éteint (`g × (1 - abri)`), fumée du feu coupée ; à l'inverse ils ressortent et se rassoient, le feu reprend.

- [ ] **Step 1:** implémenter. **Step 2:** `npm run build && npm test` OK.
- [ ] **Step 3: Captures** jour pluie (moins de monde, parapluies, pas de parapentes), jour orage (personne), nuit pluie (tentes sans feu, personne dehors), nuit dégagé (camp normal).
- [ ] **Step 4: Commit** `feat(3d): personnages qui s'adaptent à la météo`
