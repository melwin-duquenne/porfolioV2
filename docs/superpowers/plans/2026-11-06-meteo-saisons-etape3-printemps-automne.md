# Météo & saisons — Étape 3 : printemps et automne — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la forêt de sapins par une forêt majoritairement de feuillus, puis faire vivre le printemps (herbe tendre, fleurs, arbre en fleurs) et l'automne (feuillus orangés variés, sol orangé, feuilles qui tombent, citrouilles allumées la nuit), avec des transitions animées entre saisons.

**Architecture:** L'aspect de chaque saison est une table pure dans `src/seasonWeather.js` (`SEASON_LOOK`, testée). La scène reçoit déjà `{ season, weather }` par `setWeather` ; elle ajoute un état saison continu (même principe que la météo : instantané `from` → cible `to`, progression lissée sur `SEASON_DURATION` s, interruptible) qui pilote : couleurs des houppiers (par instance), teinte de l'herbe et feuilles mortes au sol (uniforms d'un shader du terrain), couleur de l'arbre en fleurs, pousse des fleurs et des citrouilles, densité des feuilles qui tombent. L'hiver reste pour l'étape 4 : ici, `SEASON_LOOK.hiver` = aspect d'été.

**Tech Stack:** Three.js 0.186 (InstancedMesh, `onBeforeCompile`), Vue 3.5, Vitest. Vérification visuelle par captures headless (`?debug3d`, scripts `init.mjs`/`shot.mjs` du scratchpad).

**Spec:** `docs/superpowers/specs/2026-11-06-meteo-saisons-design.md` (section « Printemps et automne (étape 3) »)

## Global Constraints

- Forêt **majoritairement de feuillus** low-poly instanciés, **quelques sapins seulement** (plutôt en altitude, par petits groupes). Feuillus permanents : verts en été, verts tendres au printemps, **orangés variés (jaune → roux)** en automne. Sapins toujours verts.
- **Été** : la scène actuelle avec la nouvelle forêt.
- **Printemps** : fleurs colorées dans les prairies, herbe un peu plus tendre, **arbre en fleurs roses** près du chalet.
- **Arbre en fleurs permanent** : jamais retiré, il change seulement de couleur (vert l'été, roux l'automne, rose au printemps).
- **Automne** : sol orangé par endroits, feuilles qui tombent et virevoltent, **citrouilles** autour du chalet, **allumées la nuit** comme des lanternes. Présentes tout l'automne.
- Échelle réaliste : personnage debout ≈ 0,45 ; **feuille ≈ taille d'une main (~0,05)**, **citrouille à hauteur de genou (~0,12 de haut)**, fleur ~0,04.
- Pas de pop : tout apparaît/disparaît en transition (pousse, fondu de couleur, feuilles qui finissent leur chute).
- Performances : un appel de dessin par système (houppiers, troncs, sapins, fleurs, feuilles) ; pas de lumière ajoutée (citrouilles = matériau émissif + halo sprite) ; ne pas déclencher `onSlow` plus souvent.
- Commentaires en français ; ne pas pousser.

## Review Focus

1. Changer de saison pendant une transition de saison → la scène repart de l'état courant, sans saut (Task 2 : instantané `from`, comme la météo).
2. Saison changée pendant que la scène est arrêtée (hero hors écran) ou reçue avant `start()` au chargement → appliquée tout de suite, sans transition visible depuis l'été (Task 2/3/4 : chaque système a un chemin « immédiat »).
3. Automne + pluie/orage de nuit → citrouilles allumées, feuilles et pluie ensemble, rien ne casse (captures Task 4).
4. Hiver choisi (étape 4 pas encore faite) → aspect d'été, sans fleurs ni citrouilles, aucune erreur (test Task 1 + capture Task 4).
5. Nombre de triangles de la nouvelle forêt : rester dans le même ordre de grandeur (≤ ~4×) que les sapins actuels (Task 2, compter et noter dans le ledger).

---

### Task 1: Aspect des saisons (règles pures)

**Files:** Modify `src/seasonWeather.js` ; Test `src/seasonWeather.test.js`

**Interfaces — Produces:**
- `SEASON_LOOK: Record<season, { grass: string, crowns: string[], blossom: string, flowers: number, fallen: number, falling: number, pumpkins: number }>` :
  - `printemps` : grass `'#86b862'`, crowns `['#7fb35a','#8cbf5f','#6fa651','#9ac76a']`, blossom `'#f3a9c4'`, flowers 1, fallen 0, falling 0, pumpkins 0
  - `ete` : grass `'#6f9a68'` (= `GRASS` actuel), crowns `['#3f7a45','#4a8048','#356c3e','#5a8a4a']`, blossom `'#4f8a48'`, 0, 0, 0, 0
  - `automne` : grass `'#8f9a5a'`, crowns `['#e3b23c','#d98a2b','#c9622a','#a8431f','#d9a13a']`, blossom `'#b8501f'`, flowers 0, fallen 1, falling 1, pumpkins 1
  - `hiver` : **même aspect que `ete`** (placeholder, remplacé à l'étape 4)
- `crownColor(season, v) → string` — `crowns[Math.floor(v * crowns.length)]`, `v` ∈ [0,1[ tirage fixe de l'arbre.
- `stagger(amount, r, spread = 0.5) → number` — progression 0..1 d'un élément de tirage `r` ∈ [0,1[ quand le total vaut `amount` : `clamp01((amount - r * spread) / (1 - spread))` (les `r` petits poussent d'abord, tout est à 1 quand `amount` = 1).

- [ ] **Step 1: Tests (échouent)** :
  - chaque saison de `SEASONS` a exactement les clés `['blossom','crowns','fallen','falling','flowers','grass','pumpkins']` ;
  - `crownColor('automne', 0) === '#e3b23c'`, `crownColor('automne', 0.999) === '#d9a13a'`, `crownColor('ete', 0.5) === '#4a8048'` ;
  - hiver sans fleurs ni citrouilles : `SEASON_LOOK.hiver.flowers === 0 && SEASON_LOOK.hiver.pumpkins === 0` ;
  - `stagger(0, 0.3) === 0`, `stagger(1, 0.99) === 1`, `stagger(0.5, 0) === 1`, `stagger(0.5, 1) === 0`, `stagger(0.25, 0) === 0.5`.
- [ ] **Step 2:** `npm test` → FAIL (exports absents). **Step 3:** implémenter. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(saisons): aspect du printemps et de l'automne`

### Task 2: Nouvelle forêt et transition de saison (couleurs)

**Files:** Modify `src/three/mountainScene.js`

**Interfaces:**
- Consumes : `SEASON_LOOK`, `crownColor`, `approach` (Task 1 / existant).
- Produces (dans la scène) :
  - `buildForest() → { group, setColors(e), snapshot(), target(season), crownsNear(n) }` (`crownsNear(n)` : les `n` houppiers les plus proches de la caméra, `{ x, y, z, r }`, utilisé Task 4) à la place de l'`InstancedMesh` actuel. Le groupe contient 3 `InstancedMesh` : **troncs** (`CylinderGeometry` 4 côtés, ouvert, brun `#5b4030`), **houppiers** (`IcosahedronGeometry(1, 0)`, `flatShading`, couleur par instance) et **sapins** (cône actuel, couleur `TREE` variée). Mêmes règles de placement qu'aujourd'hui (densité, pente, obstacles, `z` −90..45, `MAX = 8000` arbres en tout). Feuillu : hauteur totale ≈ celle des sapins actuels (échelle `k` 0.16–0.32 sur un arbre de ~3.4 de haut), tronc ≈ 35 % de la hauteur. **Sapins** : seulement si `base > 4.5` **et** dans une tache de bruit propre (petits groupes), visés ≈ 10–15 % des arbres. Chaque feuillu garde un tirage `v` ∈ [0,1[ ; les tableaux `instanceColor` des houppiers **ne sont pas libérés** (recalculés pendant les transitions), le reste passe par `freeAfterUpload`.
  - État saison dans `createMountainScene` : `SEASON_DURATION = 4` ; `ss` (valeurs courantes : `flowers, fallen, falling, pumpkins` + `Color` `grass`, `blossom`), `ssFrom`, `ssTo`, `ssP` ; `stepSeason(dt)` lissé par `smoothstep` comme `stepWeather`. Les houppiers : couleurs `from` (copie de l'état courant au départ d'une transition) → `to` (`crownColor(season, v)`), mélangées avec le même `e`, uniquement quand `ssP < 1`.
  - `setWeather(next)` : si `next.season` change, instantané `from` = état courant, cible `to` = `SEASON_LOOK[next.season]`, `ssP = 0` ; scène arrêtée → `stepSeason(SEASON_DURATION)` immédiat.
  - **Terrain** : deux attributs par sommet, `aMeadow` (prairie : herbe hors forêt, sous la roche, hors grève ; 0..1) et `aLeaves` (taches de bruit de feuilles mortes, en sous-bois et prairies basses ; 0..1), et un `onBeforeCompile` sur son `MeshLambertMaterial` avec les uniforms `uGrass` (vec3 = `ss.grass / GRASS` par canal) et `uFallen` (float = `ss.fallen`) : `diffuse *= mix(vec3(1), uGrass, aMeadow)` puis `mix(…, vec3(LEAF_GROUND '#c0702e'), aLeaves * uFallen * 0.6)`. Ces attributs sont libérés après envoi comme les autres.
  - **Arbre en fleurs** permanent près du chalet (`BLOSSOM = { x, z }` ajouté à `OBSTACLES`, r ≈ 1.5) : tronc + 3–4 boules d'icosaèdre, hauteur ≈ 2.2, matériau du feuillage dont la couleur = `ss.blossom` (au printemps, quelques boules blanches/roses plus claires en plus : couleur mélangée, pas d'objet ajouté/retiré). Placement : à moins de 3,5 du chalet, côté caméra ou côté gauche, ni sur le ponton ni dans l'eau, sans cacher la façade — visible sur la capture.

- [ ] **Step 1:** implémenter la forêt seule (aspect été). `npm run build && npm test` OK. Compter les triangles (houppiers × 20 + troncs × 8 + sapins × 6) et le noter dans le ledger (Review Focus 5).
- [ ] **Step 2: Captures** été jour/nuit : forêt de feuillus, quelques sapins en hauteur, pas de bande ni d'arbre dans l'eau/les camps.
- [ ] **Step 3: Commit** `feat(3d): forêt de feuillus avec quelques sapins`
- [ ] **Step 4:** implémenter l'état saison, les couleurs des houppiers, le shader du terrain et l'arbre en fleurs. `npm run build && npm test` OK.
- [ ] **Step 5: Captures** (via `init.mjs`, saison pré-réglée = chemin immédiat) printemps / été / automne de jour ; puis une transition été → automne via le menu (capture à mi-parcours ≈ 2 s de scène, et à la fin) : couleurs qui glissent sans saut.
- [ ] **Step 6: Commit** `feat(3d): couleurs des saisons (feuillus, herbe, sol, arbre en fleurs)`

### Task 3: Fleurs du printemps

**Files:** Modify `src/three/mountainScene.js`

**Interfaces:**
- Consumes : `ss.flowers` (Task 2), `stagger` (Task 1).
- Produces : `buildFlowers() → { mesh, update(amount) }` — `InstancedMesh` de `IcosahedronGeometry(1, 0)` (`flatMat`), ~5000 fleurs Ø ≈ 0,04–0,05, couleurs `['#f4f1e8','#f2c94c','#e86a8a','#9b7fd1','#e85d4a']`, regroupées en taches dans les prairies (même `aMeadow` : hors forêt dense, pente douce, hors obstacles/eau), `z` −40..45 (assez près pour se voir). Positions et tirages `r` gardés en JS ; `update(amount)` ne recalcule les matrices que si `amount` a changé : échelle de chaque fleur = `stagger(amount, r)` (elles poussent en vague), `mesh.visible = amount > 0`.
- Câblage : `flowers.update(ss.flowers)` après `stepSeason` (et dans le chemin immédiat).

- [ ] **Step 1:** implémenter. `npm run build && npm test` OK.
- [ ] **Step 2: Captures** printemps jour (taches colorées dans les prairies, échelle réaliste par rapport aux randonneurs), été (aucune fleur).
- [ ] **Step 3: Commit** `feat(3d): fleurs du printemps`

### Task 4: Automne — feuilles qui tombent et citrouilles

**Files:** Modify `src/three/ambient.js` (`buildFallingLeaves`), `src/three/mountainScene.js` (citrouilles dans `buildChalet`, câblage)

**Interfaces:**
- Consumes : `ss.falling`, `ss.pumpkins`, `stagger`, `crowns` d'automne (Task 1/2).
- Produces :
  - `buildFallingLeaves(sources, groundAt, colors) → { object, update(dt, amount), snap(amount) }` dans `ambient.js` — `sources` : positions des houppiers des ~150 feuillus les plus proches de la caméra (`{ x, y, z, r }`, fournis par `buildForest`), `groundAt(x, z)` hauteur du sol. `InstancedMesh` de ~500 petites feuilles (`PlaneGeometry(0.05, 0.035)`, double face, couleurs d'automne). Chaque feuille part d'un houppier, tombe à ~0,35 u/s en se balançant et en tournoyant (vent léger), rapetisse en 0,3 s en touchant le sol puis repart d'un houppier **avec une probabilité `amount`**, sinon dort ; une feuille endormie se réveille avec une probabilité `amount × dt`. Donc quand `amount` passe à 0, les feuilles en vol finissent leur chute (pas de pop). `snap(amount)` : répartit tout de suite des feuilles en vol (ou aucune) selon `amount`.
  - Citrouilles (dans `buildChalet`, hors `mergeStatic`) : 5 citrouilles Ø ≈ 0,15, hauteur ≈ 0,12, côtes suggérées (sphère 8×6 aplatie), tige brune ; deux de part et d'autre de la porte, les autres le long de la façade / du début du ponton (pas sur le ponton), posées sur `sampleTerrain` ; visage taillé (petites formes émissives côté caméra). `chalet.update(k, t, dt)` + `chalet.setPumpkins(amount)` : échelle = `stagger(amount, r)` ; la nuit, visage et halo (`buildOrb` additif, petit) allumés à `k × amount` avec un léger vacillement comme les fenêtres.
- Câblage : `leaves.update(dt, ss.falling)` à chaque image ; `snap` dans le chemin immédiat de `setWeather`.

- [ ] **Step 1:** implémenter. `npm run build && npm test` OK.
- [ ] **Step 2: Captures** automne jour (sol orangé par endroits, feuilles en l'air, citrouilles à hauteur de genou), automne nuit (citrouilles allumées), automne nuit + orage (citrouilles allumées, pluie et feuilles ensemble), hiver jour (aspect d'été, ni fleurs ni citrouilles — Review Focus 4).
- [ ] **Step 3: Commit** `feat(3d): feuilles qui tombent et citrouilles d'automne`
