# Météo et saisons sur la scène 3D — conception

Date : 2026-11-06 · Statut : validé en conversation, à planifier étape par étape

## Intention

La montagne 3D du hero est déjà vivante (jour/nuit animé, randonneurs, camps qui
s'installent, parapentistes qui arrivent et repartent). On veut qu'elle reflète
aussi **la saison** et **la météo**, automatiquement (date + météo réelle), tout en
restant **pilotable à la main** par le visiteur, pour le plaisir de jouer avec.

Ce qui compte, c'est l'ambiance plus que le réalisme météo : un orage doit donner
envie d'être au chaud chez soi (scène sombre, pluie, éclairs, plus personne dehors),
un hiver doit être une vraie carte postale de montagne.

## Objectifs

- Un menu discret à côté du bouton jour/nuit pour choisir saison et météo, et
  revenir en « Automatique ».
- Mode automatique : saison selon la date, météo réelle (Auch par défaut, ou
  position du visiteur s'il l'accepte).
- Les quatre saisons et quatre météos visibles dans la 3D, combinables, avec des
  transitions animées (comme jour/nuit), de jour comme de nuit.
- Respect du RGPD : aucune donnée du visiteur collectée par le site.

## Non-objectifs

- Pas de prévisions, de températures détaillées ni de « widget météo » complet.
- Pas d'automatisme de l'heure en plus de l'existant (jour/nuit garde son
  fonctionnement actuel, 20 h – 7 h + bouton).
- Pas de persistance du choix manuel au-delà de la visite.

## Anti-objectifs (échec même si « ça marche »)

- Objets à la mauvaise échelle : feuilles, citrouilles, bonhomme de neige, igloo,
  cadeaux, sapin… doivent être **réalistes par rapport aux personnages** (un
  personnage debout ≈ 0,45 unité de haut). Une feuille de la taille d'une main de
  personnage, une citrouille à hauteur de genou.
- Des choses qui apparaissent / disparaissent d'un coup (« pop ») : tout changement
  visible se fait en transition, comme le soleil, les camps et les parapentes.
- Un élément du décor qui disparaît d'une saison à l'autre alors qu'il est
  permanent (ex. l'arbre en fleurs du printemps existe toute l'année, il change
  seulement de couleur).
- Incohérences : orage en hiver, pluie (et non neige) en hiver, parapentes sous la
  pluie, personnages dehors sous l'orage.
- Dégrader les performances au point de déclencher plus souvent le repli photo
  (cf. garde-fou `onSlow` de `mountainScene.js`).
- Collecter, stocker ou transmettre à son serveur une donnée de localisation.

## Contraintes

- Stack existante : Vue 3 + Vite, Three.js (`src/three/mountainScene.js`,
  `src/three/ambient.js`, `src/three/helpers.js`), styles dans `src/style.css`,
  thème dans `src/composables/useTheme.js`.
- Style des modèles : low-poly, matériaux plats (`flatMat`), fusion des statiques
  (`mergeStatic`), instancing pour les objets nombreux ; pas de modèles externes.
- Performances : plafond 60 i/s, rendu 1×, machine lente → repli photo. Ajouter
  des effets (pluie, neige, feuilles) avec des systèmes de particules légers
  (Points / InstancedMesh), un seul appel de dessin par effet si possible.
- Commentaires et textes en français, dans le ton du code existant.
- Le dépôt pousse sur `main` et Vercel déploie depuis `main` : l'utilisateur
  regroupe plusieurs commits avant de pousser. Ne pas pousser sans demande.

## Ce qui a été décidé

### Menu (étape 1)

- **Emplacement** : un bouton rond dans la barre de navigation, juste à côté du
  bouton jour/nuit, même style (`.theme-toggle`). Maquette retenue : option « B »
  (bouton + panneau qui s'ouvre au clic).
- **Panneau** : deux rangées « Saison » (Printemps, Été, Automne, Hiver) et
  « Météo » (Dégagé, Nuageux, Pluie, Orage), icônes + libellés, état actif mis en
  évidence (vert du thème). En bas : un bouton/état **« Automatique »**, et le
  bouton **« Ma météo locale »** (opt-in géolocalisation).
- **Visible mais discret**, comme le jour/nuit ; utilisable par les visiteurs.
- Hiver sélectionné → « Pluie » s'affiche comme **Neige** (libellé/icône) et
  « Orage » est **grisé** (désactivé, pas caché). Si l'orage était actif et qu'on
  passe en hiver, la météo devient Neige (précipitations).
- **Combinable** : une saison + une météo à la fois.
- Choix manuel valable **pour la visite seulement** (sessionStorage), comme le
  thème. « Automatique » efface le choix manuel. Saison et météo peuvent être
  forcées indépendamment (forcer la saison n'empêche pas la météo de rester auto).
- Le bouton n'apparaît **que lorsque la scène 3D tourne** (état à partager entre
  `HeroSection` et `NavBar`) : jamais sur mobile / tactile / ≤ 900 px ni en repli
  photo (cf. `canUse3D()`), ni avant le chargement de la scène. Sans 3D, aucun
  appel à Open-Meteo. *(choix de Claude)*

### Mode automatique

- **Saison** selon la date (saisons météorologiques : déc–fév hiver, mars–mai
  printemps, juin–août été, sept–nov automne), décalées de 6 mois dans
  l'hémisphère sud (seulement connu si le visiteur a partagé sa position ;
  sinon hémisphère nord, Auch).
- **Météo** : API **Open-Meteo** (gratuite, sans clé, sans cookies), appelée
  **depuis le navigateur**. Par défaut, coordonnées d'**Auch** (≈ 43.65 N, 0.59 E).
- **« Ma météo locale »** : opt-in explicite. Au clic, géolocalisation du
  navigateur (fenêtre d'autorisation) ; coordonnées **arrondies à ~10 km** avant
  la requête ; jamais envoyées au serveur du site, jamais stockées au-delà de la
  visite. Refus ou erreur → on reste sur Auch, sans message intrusif.
- Correspondance des codes météo Open-Meteo (WMO) → 4 états : ciel clair / peu
  nuageux → Dégagé ; nuageux, couvert, brouillard → Nuageux ; bruine, pluie,
  averses, neige → Pluie (rendue en neige si saison = hiver) ; orage → Orage
  (rendu en Pluie/Neige si saison = hiver).
- Résultat gardé pour la visite (pas de nouvelle requête à chaque page).
- Mentions légales (`src/data/legal.json`) : une ligne sur Open-Meteo et la
  position facultative, arrondie, non conservée.

### Météo dans la 3D (étape 2)

| Météo | Ciel / nuages | Lumière | Personnages |
|---|---|---|---|
| Dégagé | peu ou pas de nuages | comme aujourd'hui | comme aujourd'hui |
| Nuageux | beaucoup de nuages **blancs**, bas, qui **cachent les sommets** | un peu plus terne | comme aujourd'hui |
| Pluie | mêmes nuages bas, **gris sombre** ; pluie qui tombe | scène plus sombre | **moins de personnages**, avec **parapluies** ; **pas de parapentes** |
| Orage | nuages **quasi noirs**, pluie, **éclairs** | encore plus sombre, flashs | **personne dehors** (randonneurs, pêcheur, parapentes) ; la nuit, **tentes montées sans feu** et sans campeurs dehors |

- **Camps de nuit sous la pluie (et sous la neige qui tombe en hiver)** : comme
  l'orage — tentes montées, **feu éteint**, campeurs à l'abri (pas dehors).
- **Ciel** : la météo assombrit aussi le **ciel CSS du hero** (`--sky-1/2` du
  hero, et le brouillard de la scène qui s'y fond), synchronisé avec la 3D. Le
  reste de la page (thème, `theme-color`) ne change pas. *(choix de Claude)*

- Fumée de la cheminée du chalet conservée dans toutes les météos (« au chaud »).
- Les parapentes partent / arrivent avec leurs animations existantes (vol plané
  de départ, chute libre puis ouverture à l'arrivée).
- Neige qui tombe en hiver = l'équivalent de la pluie : moins de monde, quelques
  skieurs continuent, pas de parapluie.

### Printemps et automne (étape 3)

- **Forêt remplacée** (préalable de l'étape 3) : aujourd'hui `buildForest()` ne
  fait que des sapins. On la remplace par une forêt **majoritairement de feuillus**
  low-poly (instanciés), en ne gardant **que quelques sapins** (plutôt en altitude,
  par petits groupes). Les feuillus sont **permanents** et changent avec les
  saisons : verts en été, verts tendres au printemps, orangés variés en automne,
  **nus et enneigés** en hiver ; les sapins restants restent verts (enneigés en
  hiver). Le décor d'été change donc un peu (feuillus au lieu de sapins) : c'est
  voulu.
- **Été** : la scène actuelle, avec la nouvelle forêt.
- **Printemps** : base été + **fleurs** colorées dans les prairies ; vert d'herbe
  un peu plus tendre ; un **arbre en fleurs roses** près du chalet. Cet arbre est
  **permanent** : vert en été, roux en automne, enneigé/nu en hiver, en fleurs au
  printemps.
- **Automne** : arbres feuillus en **orangés variés** (jaune → roux) ; sol orangé
  par endroits (feuilles tombées) ; **feuilles qui tombent** et virevoltent au
  vent ; **citrouilles** autour du chalet, qui s'**allument la nuit** comme des
  lanternes.

### Hiver (étape 4)

- Neige partout (sol, roches, toit du chalet) ; feuillus nus avec de la neige sur
  les branches, sapins chargés de neige.
- **Pas de parapentes** ; à la place, des **skieurs**.
- Personnages **équipés pour la neige** (bonnet, couleurs d'hiver…).
- **Lac gelé** avec des **patineurs** ; **plus de pêcheur**.
- **Sapin de Noël** avec **cadeaux** à côté du chalet ; **guirlandes lumineuses**
  la nuit.
- **Bonhomme de neige** près du chalet ; un **igloo** quelque part dans le décor.
- Fumée de cheminée plus épaisse.
- **Camps de nuit conservés** (randonneurs), avec **un peu de neige sur le haut des
  tentes**.

### Livraison

Quatre étapes, chacune livrable et commitée séparément, dans cet ordre :
1. Menu + mode automatique (pas encore d'effet 3D).
2. Météo dans la 3D.
3. Printemps et automne.
4. Hiver.

## Laissé au builder

- Architecture de l'état (composable type `useSeasonWeather` à l'image de
  `useTheme`, API exposée par la scène type `setSeason` / `setWeather`).
- Modélisation low-poly précise de chaque objet (dans le respect des échelles).
- Durées et courbes des transitions (référence : jour/nuit 2,4 s ; installation du
  camp ~6 s), densité des particules, fréquence des éclairs.
- Placement exact de l'igloo, du sapin, du bonhomme de neige, des citrouilles,
  de l'arbre en fleurs (près du chalet, visibles depuis la caméra).
- Icônes SVG du panneau (ajoutées au sprite `SvgIcon` existant).
- Comportement mobile du panneau (doit tenir dans 320 px de large).

## Choix faits par Claude (à vérifier)

- Saisons météorologiques (par mois) plutôt qu'astronomiques.
- Décorations d'Halloween présentes tout l'automne, sapin de Noël tout l'hiver.
- Saison et météo forçables indépendamment.
- Précipitations rendues en neige uniquement selon la saison (pas selon le code
  météo) pour rester cohérent avec le décor.
- Le ciel CSS du hero suit la météo ; le reste de la page non.
- Bouton du menu visible uniquement quand la 3D tourne (donc absent sur mobile).
