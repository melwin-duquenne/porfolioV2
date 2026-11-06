# Météo & saisons — Étape 4 : l'hiver — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de l'hiver une carte postale de montagne : neige partout, feuillus nus enneigés, sapins chargés de neige, lac gelé avec patineurs, skieurs à la place des parapentes, randonneurs en bonnet, sapin de Noël avec cadeaux et guirlande allumée la nuit, bonhomme de neige, igloo, neige sur les tentes, fumée plus épaisse.

**Architecture:** On complète ce que l'étape 3 a posé. `SEASON_LOOK.hiver` devient un vrai aspect, avec 4 nouvelles quantités pour toutes les saisons : `snow` (neige au sol, toits, tentes, sapins, bonnets), `ice` (lac gelé), `crownSize` (taille des houppiers, 1 → 0,55 pour des arbres nus) et `decor` (décor d'hiver). Elles glissent avec l'état saison existant (`ss`, `stepSeason`, 4 s). `crowd()` gagne `skiers` et `skaters` (parts 0..1), et l'hiver retire pêcheur et lucioles. Les nouveaux personnages réutilisent le principe des randonneurs : un tirage fixe `r`, une présence animée, ils rapetissent en s'enfonçant.

**Tech Stack:** Three.js 0.186, Vitest. Vérification visuelle par captures headless (`?debug3d`, `init.mjs`, `shot.mjs` du scratchpad).

**Spec:** `docs/superpowers/specs/2026-11-06-meteo-saisons-design.md` (section « Hiver (étape 4) »)

## Global Constraints

- **Neige partout** (sol, roches peu pentues, toit du chalet) ; **feuillus nus avec de la neige**, **sapins chargés de neige**.
- **Pas de parapentes** ; à la place, des **skieurs**. **Lac gelé** avec **patineurs** ; **plus de pêcheur**.
- Personnages **équipés pour la neige** (bonnet).
- **Sapin de Noël** avec **cadeaux** à côté du chalet, **guirlande lumineuse la nuit** ; **bonhomme de neige** près du chalet ; **igloo** quelque part dans le décor.
- **Fumée de cheminée plus épaisse.** **Camps de nuit conservés**, avec **un peu de neige sur le haut des tentes**.
- Neige qui tombe (« Pluie » en hiver) : moins de monde, **quelques skieurs continuent**, pas de parapluie, camps à l'abri (déjà fait à l'étape 2).
- **Échelle réaliste** (personnage debout ≈ 0,45 ⇒ 1 unité ≈ 4 m) : bonhomme de neige ≈ 0,4 de haut, igloo ≈ 0,5 de diamètre et 0,25 de haut, sapin de Noël ≈ 0,7, cadeaux 0,05–0,09, skis ≈ 0,4. Exception déjà admise : les personnages lointains sont grossis comme la zone de randonnée du fond (`scale` 1,6) et le pêcheur (1,7) ; skieurs et patineurs suivent cette règle.
- Pas de pop : neige et glace en fondu, décor et personnages poussent ou rapetissent (`stagger`, présence).
- Performances : un appel de dessin par système nombreux ; **aucune lumière ajoutée** (guirlande et igloo = matériaux émissifs ou non éclairés + halos sprites).
- Commentaires en français ; ne pas pousser.

## Review Focus

1. Hiver ↔ autre saison pendant que la scène tourne : neige, glace, houppiers, décor et personnages passent en douceur, sans saut, même interrompus (Task 2/3/4 suivent `ss` ; captures à mi-transition).
2. Hiver choisi scène arrêtée ou au chargement : tout est en place immédiatement, sans patineurs ni skieurs qui poussent sous les yeux (chemin « immédiat » de `setCrowd`, comme les randonneurs).
3. Hiver de nuit : camps montés avec neige sur les tentes, guirlande et igloo allumés, pas de lucioles, pas de pêcheur (captures Task 2/4).
4. Hiver + neige qui tombe : skieurs et patineurs réduits de moitié, aucun parapluie, flocons (test `crowd` Task 1 + capture Task 3).
5. Retour de l'hiver vers l'été : le pêcheur revient, les parapentes reviennent (chute libre existante), les houppiers reprennent leur taille (captures Task 3).

---

### Task 1: Règles d'hiver (pures)

**Files:** Modify `src/seasonWeather.js` ; Test `src/seasonWeather.test.js`

**Interfaces — Produces:**
- `SEASON_LOOK[s]` gagne `snow`, `ice`, `crownSize` et `decor` pour toutes les saisons. Printemps, été et automne : `snow 0, ice 0, crownSize 1, decor 0`.
- `SEASON_LOOK.hiver` :
  - `grass '#6f9a68'`
  - `crowns ['#e9eef0', '#dfe5e8', '#cfd6da', '#b9b2a8']` (branches nues saupoudrées)
  - `blossom '#e6ecef'`
  - `flowers 0, fallen 0, falling 0, pumpkins 0`
  - `snow 1, ice 1, crownSize 0.55, decor 1`
- `crowd(season, weather)` gagne `skiers` et `skaters`, deux nombres de 0 à 1 :
  - hors hiver : `0` et `0`.
  - hiver dégagé ou nuageux : `{ hikers: 1, umbrellas: false, paragliders: false, birds: true, fireflies: false, fisher: false, campFire: true, skiers: 1, skaters: 1 }`.
  - hiver avec neige qui tombe (`'pluie'`) : `{ hikers: 0.35, umbrellas: false, paragliders: false, birds: false, fireflies: false, fisher: false, campFire: false, skiers: 0.5, skaters: 0.5 }`.
  - orage : `skiers: 0, skaters: 0`.

- [ ] **Step 1: Tests (échouent)** :
  - Mettre à jour les attentes `toEqual` existantes de `crowd` avec `skiers: 0, skaters: 0`.
  - Ajouter `crowd('hiver','degage')` et `crowd('hiver','pluie')` avec les objets complets ci-dessus.
  - Clés de `SEASON_LOOK` pour chaque saison : `['blossom','crownSize','crowns','decor','fallen','falling','flowers','grass','ice','pumpkins','snow']`.
  - `SEASON_LOOK.hiver` : `snow === 1`, `ice === 1`, `decor === 1`, `crownSize === 0.55`.
  - `SEASON_LOOK.ete.crownSize === 1`.
  - `crownColor('hiver', 0) === '#e9eef0'`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implémenter. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(saisons): règles de l'hiver`

### Task 2: Paysage enneigé et lac gelé

**Files:** Modify `src/three/mountainScene.js`, `src/three/ambient.js` (`buildSmoke`)

**Interfaces:**
- Consumes : `ss.snow`, `ss.ice`, `ss.crownSize`, palette d'hiver (Task 1), état saison et `applySeason` (étape 3).
- Produces :
  - **Terrain.**
    - Attribut `aCover` (0..1) : là où la neige tient. C'est `dry × clamp01((normale.y − 0.6) / 0.2)`, donc pas sur les pentes raides, la grève ni sous l'eau.
    - Uniform `uSnow` (= `ss.snow`) : après la prairie et les feuilles, `mix(…, SNOW, uSnow * aCover * 0.92)`.
  - **Houppiers.** Uniform `uCrownSize` (= `ss.crownSize`), injecté par `onBeforeCompile` du matériau des houppiers. Dans le repère de la géométrie, avant l'instanciation, le houppier se resserre autour de son centre `(0, 2.25, 0)` : `transformed = center + (transformed − center) * uCrownSize`. La couleur vient de la palette d'hiver, déjà gérée par `forest.target`.
  - **Sapins.** Uniform `uSnow` : `mix(diffuse, SNOW, uSnow * 0.5)`.
  - **Arbre en fleurs.** Il suit `ss.blossom`, rien à ajouter.
  - **Chalet.** `chalet.setSeason({ pumpkins, snow, decor })` remplace `setPumpkins` (`decor` sert Task 4).
    - Neige sur le toit : prisme blanc un peu plus grand que le toit, transparent, opacité = `snow`, `visible = snow > 0`, hors `mergeStatic`.
    - Fumée : `smoke.update(k, t, snow)`.
  - **Fumée.** `buildSmoke(...).update(k, t, thick = 0)` : bouffées ×(1 + 0,6·thick) en taille et ×(1 + 0,3·thick) en opacité (plafonnée à 1).
  - **Tentes.**
    - `camps.setSnow(a)` : chaque tente a un capuchon blanc enfant, cône 4 faces sur les ~40 % du haut, 4 % plus large.
    - Il est monté et plié avec la tente. Matériau partagé transparent, opacité `a`.
  - **Lac.** Disque de glace à part (même ellipse × 0,97, `WATER_LEVEL + 0.02`), `MeshLambertMaterial('#dbe7ee')` transparent, opacité `0.92 × ice`, `depthWrite: false`, `visible = ice > 0`.
  - **Câblage.** `applySeason` pose `uSnow` (terrain, sapins), `uCrownSize`, `chalet.setSeason`, `camps.setSnow` et l'opacité de la glace. `crowd` d'hiver retire déjà le pêcheur et les lucioles via le câblage existant.

- [ ] **Step 1:** implémenter. `npm run build && npm test` OK.
- [ ] **Step 2: Captures** (saison pré-réglée) :
  - hiver jour : sol et roches peu pentues blancs, feuillus nus clairs, sapins enneigés, lac gelé, toit blanc, pas de pêcheur ;
  - hiver nuit : tentes montées avec neige en haut, fumée épaisse, pas de lucioles ;
  - transition été → hiver via le menu, à mi-parcours et à la fin.
- [ ] **Step 3: Commit** `feat(3d): paysage d'hiver, neige et lac gelé`

### Task 3: Gens de l'hiver — bonnets, skieurs, patineurs

**Files:** Modify `src/three/mountainScene.js`

**Interfaces:**
- Consumes : `crowd(...).skiers`, `crowd(...).skaters` (Task 1), `ss.snow`, `stagger`, `approach`.
- Produces :
  - **Randonneurs.** `hikers.setGear(a)` : bonnet par instance, cône Ø ≈ 0,1 et pompon fusionnés (`mergeGeometries`), couleurs variées, posé sur la tête (y ≈ 0,44). Échelle de chaque bonnet = `a` (= `ss.snow`), ce qui l'ajoute à la matrice du corps.
  - **Skieurs.** `buildSkiers() → { group, update(dt), setCrowd({ skiers }, now) }`.
    - Modèle : 5 skieurs, `scale` 1,6. Personnage fléchi, penché en avant, couleurs vives, bonnet, skis (≈ 0,4 × 0,02 × 0,03), bâtons. `InstancedMesh` par pièce, comme les randonneurs.
    - Trajet : ils descendent en godille (sinusoïde) une pente enneigée visible, choisie par capture : derrière le lac ou à droite, hors camps et obstacles, hauteur `sampleTerrain`. Vitesse ≈ 2 u/s.
    - Boucle : en bas ils rapetissent (0,6 s) puis repartent en haut en grandissant, décalés entre eux.
    - Présence (`r < skiers`), animée comme les randonneurs. `now` ou groupe caché = immédiat.
    - Visibles de jour seulement : ajoutés à `animated` avec `when: 'day'`.
  - **Patineurs.** `buildSkaters() → { group, update(dt), setCrowd({ skaters }, now) }`.
    - Modèle : 6 patineurs, `scale` 1,6, sur la glace (`WATER_LEVEL + 0.03`). Chacun glisse sur sa propre boucle (ellipse ou huit) à l'intérieur de `lakeDistance < 0.6`, à ≈ 0,8 u/s, penché dans les virages, jambes en poussée alternée.
    - Présence comme ci-dessus. Le groupe n'est visible que si `ss.ice > 0.5` et de jour.
  - **Câblage.** `setWeather` appelle `skiers.setCrowd` et `skaters.setCrowd` à côté de `hikers.setCrowd`. `applySeason` appelle `hikers.setGear(ss.snow)`.

- [ ] **Step 1:** implémenter. `npm run build && npm test` OK.
- [ ] **Step 2: Captures** (avec recadrages zoomés) :
  - hiver jour : skieurs sur la pente, patineurs sur le lac, bonnets ;
  - hiver + neige qui tombe : moins de monde ;
  - hiver → été via le menu : skieurs et patineurs partent, le pêcheur et les parapentes reviennent.
- [ ] **Step 3: Commit** `feat(3d): skieurs, patineurs et bonnets d'hiver`

### Task 4: Décor d'hiver — sapin de Noël, bonhomme de neige, igloo

**Files:** Modify `src/three/mountainScene.js`

**Interfaces:**
- Consumes : `chalet.setSeason({ decor })` (Task 2), `stagger`, `buildOrb`.
- Produces :
  - **Chalet (repère local, côté caméra : arrière gauche, comme les citrouilles).** Un groupe `winterDecor` hors `mergeStatic`. Chaque objet pousse selon `stagger(decor, r)`.
    - **Sapin de Noël ≈ 0,7** : 3 cônes empilés vert foncé avec pointes blanches, étoile dorée émissive.
    - **Cadeaux** : 4 boîtes de 0,05 à 0,09, rouge, bleu, or, vert, avec ruban.
    - **Guirlande** : environ 24 ampoules (Ø ≈ 0,02) en spirale, `InstancedMesh` en `MeshBasicMaterial` multicolore. La luminosité suit `0.35 + 0.65·k`, avec un clignotement doux. Ajouter un halo sprite chaud de nuit (`k × decor`).
    - **Bonhomme de neige ≈ 0,4** : 3 boules (r ≈ 0,1 / 0,075 / 0,055), nez carotte, yeux et boutons, écharpe rouge.
    - Les citrouilles gardent leurs emplacements. Sapin et bonhomme vont à des places libres du même côté, sans chevauchement (les deux décors ne se voient jamais pleinement ensemble).
  - **Igloo.** `buildIgloo() → { group, update(k, amount) }`, placé dans la scène sur un replat enneigé visible, hors des camps et à l'écart du chalet. Choisi par capture ; ajouter l'emprise (r ≈ 1) à `OBSTACLES`.
    - Forme : dôme demi-sphère low-poly (Ø ≈ 0,5, h ≈ 0,25) blanc bleuté, joints de blocs suggérés par `flatShading`, et tunnel d'entrée (demi-cylindre ≈ 0,12 × 0,2).
    - La nuit, l'entrée s'éclaire : matériau émissif chaud (`k × amount`) et petit halo.
    - Échelle = `stagger(amount, 0.3)`.

- [ ] **Step 1:** implémenter. `npm run build && npm test` OK.
- [ ] **Step 2: Captures** :
  - hiver jour et nuit (recadrage sur le chalet : sapin, cadeaux, bonhomme, guirlande allumée la nuit ; igloo visible et éclairé la nuit) ;
  - automne → hiver via le menu : les citrouilles s'en vont, le décor d'hiver pousse.
- [ ] **Step 3: Commit** `feat(3d): sapin de Noël, bonhomme de neige et igloo`
