// Scène 3D du hero : chaîne de montagnes lissée, générée procéduralement.
// Aucun modèle à charger — tout le relief vient d'un bruit seedé.
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshBasicMaterial,
  CircleGeometry,
  Mesh,
  DirectionalLight,
  HemisphereLight,
  Fog,
  Color,
  BufferAttribute,
  ConeGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  BoxGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  SphereGeometry,
  CylinderGeometry,
  Group,
  Euler,
  Sprite,
  SpriteMaterial,
  BufferGeometry,
  Points,
  PointsMaterial,
  PointLight,
  AdditiveBlending,
  SRGBColorSpace,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  buildBirds,
  buildCloudBank,
  buildClouds,
  buildFireflies,
  buildFallingLeaves,
  buildFishJump,
  buildLightning,
  buildParagliders,
  buildPrecipitation,
  buildShootingStar,
  buildSmoke,
} from './ambient.js'
import { canvasTexture, flatMat } from './helpers.js'
import { themeColor } from '../themeColors.js'
import { WEATHER_LOOK, SKY_VEIL, SEASON_LOOK, approach, crowd, crownColor, stagger } from '../seasonWeather.js'

function seeded(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// ---------- bruit 2D (value noise seedé) ----------
function makeNoise(seed = 7) {
  const p = Array.from({ length: 256 }, (_, i) => i)
  const rand = seeded(seed)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const hash = (x, y) => perm[perm[x & 255] + (y & 255)] / 255
  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const u = smoothstep(x - xi)
    const v = smoothstep(y - yi)
    const a = hash(xi, yi)
    const b = hash(xi + 1, yi)
    const c = hash(xi, yi + 1)
    const d = hash(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

// fbm "ridged" : donne des crêtes marquées plutôt que des collines molles
function ridged(noise, x, y) {
  let sum = 0
  let amp = 0.55
  let freq = 1
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(noise(x * freq, y * freq) * 2 - 1)
    sum += n * n * amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smoothstep = (t) => t * t * (3 - 2 * t) // t dans [0, 1]

// Mélange de couleurs comme le fait le CSS (en sRGB) : Three.js mélange en
// linéaire, ce qui donnerait un brouillard plus clair que le voile du ciel.
const rgbA = { r: 0, g: 0, b: 0 }
const rgbB = { r: 0, g: 0, b: 0 }
function mixSRGB(out, a, b, t) {
  a.getRGB(rgbA, SRGBColorSpace)
  b.getRGB(rgbB, SRGBColorSpace)
  return out.setRGB(
    rgbA.r + (rgbB.r - rgbA.r) * t,
    rgbA.g + (rgbB.g - rgbA.g) * t,
    rgbA.b + (rgbB.b - rgbA.b) * t,
    SRGBColorSpace
  )
}
const easeOutCubic = (t) => 1 - (1 - t) ** 3
// dépasse un peu 1 avant de s'y poser (petit rebond)
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

// palette alignée sur le thème "Brume"
const GRASS = new Color('#6f9a68')
const FOREST = new Color('#3f7650')
const ROCK = new Color('#8a958a')
const SNOW = new Color('#f5f7f1')
const FOREST_FLOOR = new Color('#355f42')
const TREE = new Color('#2c5a3a')
const SHORE = new Color('#b3ad8a') // grève de sable et de galets
const LAKE_BED = new Color('#3c5f5c') // fond vu à travers l'eau

// Lac d'altitude, à droite du texte du hero : perché sur une pente tournée vers
// la caméra (assez basse — dans un creux de vallée, les collines le cacheraient).
const LAKE = { x: 20, z: 3, rx: 14, rz: 10 }
const WATER_LEVEL = 6.6
const LAKE_FLOOR = WATER_LEVEL - 2.5
// Chalet sur la rive gauche : replat juste au-dessus de l'eau, visible depuis la caméra
const CHALET = { x: 7.8, z: 8.9 }
// Arbre en fleurs (permanent, il ne fait que changer de couleur), à côté du chalet
const BLOSSOM = { x: 5.4, z: 11 }
const LEAF_GROUND = new Color('#c0702e') // tapis de feuilles mortes

// Camps de randonneurs (tentes autour d'un feu), sur des replats visibles depuis
// la caméra. `scale` grossit le camp perché, plus loin, pour qu'il reste lisible.
// `seats` (optionnel) : angles des campeurs autour du feu. La caméra est côté +z
// (angle π/2) : on évite d'y asseoir quelqu'un, il cacherait les flammes.
const CAMPS = [
  { x: 12, z: 18, tents: 3, campers: 4, scale: 1 }, // au bord du lac
  // bivouac en altitude : un campeur à gauche du feu (π), l'autre derrière (3π/2)
  { x: 18, z: -14, tents: 1, campers: 2, scale: 1.4, seats: [Math.PI, Math.PI * 1.5] },
]
const CAMP_RADIUS = 2.5 // rayon de la clairière aplanie (× scale)

// Emprises où rien ne pousse et où les randonneurs ne passent pas (rayon r) ;
// chaque placement ajoute sa propre marge via `isBlocked`.
const OBSTACLES = [
  { x: CHALET.x, z: CHALET.z, r: 2 },
  { x: BLOSSOM.x, z: BLOSSOM.z, r: 1.5 },
  ...CAMPS.map((c) => ({ x: c.x, z: c.z, r: 3 * c.scale })),
]

const noise = makeNoise(11)

// Clairière du camp qui contient (x, z), ou undefined.
const campAt = (x, z) =>
  CAMPS.find((c) => Math.hypot(x - c.x, z - c.z) < (CAMP_RADIUS + 1.5) * c.scale)

// 1 dans la clairière du camp `c`, 0 au bord (fondu sur 1.5 × scale)
const campBlend = (c, x, z) =>
  smoothstep(clamp01(((CAMP_RADIUS + 1.5) * c.scale - Math.hypot(x - c.x, z - c.z)) / (1.5 * c.scale)))

// Distance normalisée au centre du lac (1 ≈ bord de la cuvette), rive
// irrégulière grâce au bruit.
function lakeDistance(x, z) {
  return (
    Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) +
    (noise(x * 0.1 + 31.7, z * 0.1 - 8.3) - 0.5) * 0.3
  )
}

// Dans l'eau ou sur la grève (à `margin` au-dessus de la surface) ?
function nearWater(x, z, h, margin) {
  return h < WATER_LEVEL + margin && lakeDistance(x, z) < 1.3
}

// Moraine qui retient l'eau côté aval, puis cuvette creusée dedans.
function shapeLake(base, x, z) {
  const d = lakeDistance(x, z)
  if (d > 1.25) return base
  base += Math.max(0, WATER_LEVEL + 0.4 - base) * clamp01((1.25 - d) / 0.3)
  return base + (LAKE_FLOOR - base) * smoothstep(clamp01((1 - d) / 0.45))
}

// Bloqué par l'eau (ou sa grève) ou par une emprise, avec une marge `pad` ?
function isBlocked(x, z, h, pad) {
  return (
    nearWater(x, z, h, 0.3 + pad / 5) ||
    OBSTACLES.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + pad)
  )
}

// Relief de fond (lac compris), avant les clairières des camps et le détail rocheux.
function baseHeight(x, z) {
  // plus on s'éloigne (z négatif), plus le relief monte : premier plan bas
  // pour laisser le texte lisible, sommets au fond.
  const far = clamp01((55 - z) / 140)
  const r = ridged(noise, x * 0.016 + 3.1, z * 0.02 - 1.7)
  return shapeLake(r * 50 * (0.12 + Math.pow(far, 1.25)) + noise(x * 0.03, z * 0.03) * 2, x, z)
}

// Sol des clairières : relief de fond au centre de chaque camp.
for (const c of CAMPS) c.ground = baseHeight(c.x, c.z)

// Relief de fond avec les clairières aplanies (sans le détail rocheux).
function groundBase(x, z) {
  const base = baseHeight(x, z)
  const c = campAt(x, z)
  return c ? base + (c.ground - base) * campBlend(c, x, z) : base
}

// Relief en un point (x, z) — partagé par le terrain et le placement des arbres.
function sampleTerrain(x, z) {
  const base = groundBase(x, z)

  // stries d'érosion : bruit étiré dans le sens de la pente (axe z),
  // + un grain rocheux plus fin. Seulement au-dessus de la zone d'herbe,
  // et pas dans les clairières (le camp reste plat).
  let rockMask = clamp01((base - 8) / 14)
  if (rockMask > 0) {
    const c = campAt(x, z)
    if (c) rockMask *= 1 - campBlend(c, x, z)
  }
  if (rockMask === 0) return { base, h: base, rockShade: 0 }
  const gullies = ridged(noise, x * 0.13 + 7.7, z * 0.035 - 2.9)
  const grain = ridged(noise, x * 0.09 - 4.1, z * 0.09 + 6.3)
  const detail = gullies * 0.7 + grain * 0.3

  return {
    base,
    h: base + (detail - 0.4) * 4.5 * rockMask,
    rockShade: rockMask * (detail * 0.3 - 0.18), // 0 hors zone rocheuse
  }
}

// Pente locale en (x, z), différence finie de pas `step`.
function slope(x, z, h, step = 1) {
  return Math.hypot(sampleTerrain(x + step, z).h - h, sampleTerrain(x, z + step).h - h)
}

// Forêts : taches de bruit basse fréquence, limitées au bas des pentes.
function forestDensity(x, z, base) {
  const patch = clamp01((noise(x * 0.03 + 20.5, z * 0.03 - 11.2) - 0.5) / 0.12)
  const low = clamp01((6.5 - base) / 3) // disparaît en montant vers la roche
  return patch * low
}

function buildTerrain() {
  // maillage dense : pentes lisses + assez de points pour les stries rocheuses
  const geo = new PlaneGeometry(320, 200, 256, 160)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const tmp = new Color()
  let maxH = 0
  const rockiness = new Float32Array(pos.count)
  const woods = new Float32Array(pos.count)
  const meadow = new Float32Array(pos.count)
  const leaves = new Float32Array(pos.count)
  const cover = new Float32Array(pos.count)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const { base, h, rockShade } = sampleTerrain(x, z)
    rockiness[i] = rockShade
    woods[i] = forestDensity(x, z, base)
    if (h > maxH) maxH = h
    pos.setY(i, h)
  }

  // normales lissées (plus de facettes) — calculées avant les couleurs
  // pour que la neige tienne sur les zones peu pentues
  geo.computeVertexNormals()
  const normals = geo.attributes.normal

  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / maxH
    const flat = normals.getY(i) // 1 = plat, 0 = vertical
    // limite des neiges irrégulière, plus basse sur les replats
    const snowLine =
      0.5 + (noise(pos.getX(i) * 0.08, pos.getZ(i) * 0.08) - 0.5) * 0.12 - (flat - 0.7) * 0.25
    const snow = clamp01((t - snowLine) / 0.08)

    if (t < 0.2) tmp.copy(FOREST).lerp(GRASS, t / 0.2)
    else if (t < 0.45) tmp.copy(GRASS).lerp(ROCK, (t - 0.2) / 0.25)
    else tmp.copy(ROCK)
    // creux des stries plus sombres, arêtes plus claires
    tmp.multiplyScalar(1 + rockiness[i])
    // sol de sous-bois plus sombre sous les forêts
    tmp.lerp(FOREST_FLOOR, woods[i] * 0.7)
    tmp.lerp(SNOW, snow)
    // grève autour de l'eau, fond plus sombre en dessous
    const y = pos.getY(i)
    let shore = 0
    if (nearWater(pos.getX(i), pos.getZ(i), y, 0.7)) {
      shore = clamp01(1 - Math.abs(y - WATER_LEVEL - 0.15) / 0.55)
      tmp.lerp(SHORE, shore * 0.8)
      tmp.lerp(LAKE_BED, clamp01((WATER_LEVEL - y) / 1.5))
    }

    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b

    // part de prairie (teintée selon la saison) et taches de feuilles mortes
    // (sous-bois et prairies basses), jamais sur la neige, la grève ni sous l'eau
    const dry = (1 - snow) * (1 - shore) * (1 - clamp01((WATER_LEVEL - y) / 0.5))
    meadow[i] = (t < 0.2 ? 1 : clamp01(1 - (t - 0.2) / 0.25)) * (1 - woods[i] * 0.5) * dry
    leaves[i] =
      clamp01((noise(pos.getX(i) * 0.11 + 9.3, pos.getZ(i) * 0.11 - 4.1) - 0.5) / 0.15) *
      clamp01((0.3 - t) / 0.1) *
      dry
    // l'hiver, la neige tient partout sauf sur les pentes raides
    cover[i] = dry * clamp01((flat - 0.6) / 0.2)
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3))
  geo.setAttribute('aMeadow', new BufferAttribute(meadow, 1))
  geo.setAttribute('aLeaves', new BufferAttribute(leaves, 1))
  geo.setAttribute('aCover', new BufferAttribute(cover, 1))

  // Saisons : l'herbe des prairies est multipliée par `uGrass` (rapport entre la
  // teinte de saison et GRASS), le sol se couvre de feuilles mortes (`uFallen`)
  // ou de neige (`uSnow`, là où elle tient : `aCover`).
  const uniforms = {
    uGrass: { value: new Color(1, 1, 1) },
    uFallen: { value: 0 },
    uLeafGround: { value: LEAF_GROUND },
    uSnow: { value: 0 },
    uSnowColor: { value: SNOW },
  }
  const mat = new MeshLambertMaterial({ vertexColors: true })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMeadow;\nattribute float aLeaves;\nattribute float aCover;\nvarying float vMeadow;\nvarying float vLeaves;\nvarying float vCover;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvMeadow = aMeadow;\nvLeaves = aLeaves;\nvCover = aCover;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGrass;\nuniform float uFallen;\nuniform vec3 uLeafGround;\nuniform float uSnow;\nuniform vec3 uSnowColor;\nvarying float vMeadow;\nvarying float vLeaves;\nvarying float vCover;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), uGrass, vMeadow);\ndiffuseColor.rgb = mix(diffuseColor.rgb, uLeafGround, vLeaves * uFallen * 0.6);\ndiffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, vCover * uSnow * 0.92);'
      )
  }
  const mesh = new Mesh(geo, mat)
  mesh.userData.season = uniforms
  return mesh
}

// Données statiques : une fois envoyées à la carte graphique, inutile d'en garder
// une copie côté JavaScript (le relief est recalculé par sampleTerrain au besoin).
function freeAfterUpload(mesh) {
  // three calcule la sphère englobante au premier rendu, juste APRÈS l'envoi au
  // GPU : on la calcule avant, tant que les tableaux existent encore
  mesh.geometry.computeBoundingSphere()
  if (mesh.isInstancedMesh) mesh.computeBoundingSphere()

  const free = function () {
    this.array = null
  }
  const { geometry } = mesh
  for (const attr of Object.values(geometry.attributes)) attr.onUpload(free)
  geometry.index?.onUpload(free)
  if (mesh.isInstancedMesh) {
    mesh.instanceMatrix.onUpload(free)
    mesh.instanceColor?.onUpload(free)
  }
}

// Forêt low-poly : surtout des feuillus (tronc + houppier), quelques sapins en
// petits groupes vers le haut des pentes. Un InstancedMesh par forme : des
// milliers d'arbres en trois appels de dessin. Les houppiers changent de couleur
// avec les saisons (cf. SEASON_LOOK) : chaque feuillu garde son tirage `v`.
function buildForest() {
  const MAX = 8000
  const rand = seeded(4242)

  // repère d'un arbre : origine à la base, ~3.4 de haut avant mise à l'échelle
  const trunkGeo = new CylinderGeometry(0.1, 0.14, 1.3, 3, 1, true)
  trunkGeo.translate(0, 0.65, 0)
  const crownGeo = new IcosahedronGeometry(1, 0)
  crownGeo.scale(1, 1.15, 1)
  crownGeo.translate(0, 2.25, 0)
  // sapin = cône posé sur le sol, sans fond (jamais visible)
  const firGeo = new ConeGeometry(1, 3.4, 6, 1, true)
  firGeo.translate(0, 1.7, 0)

  const trunks = new InstancedMesh(trunkGeo, flatMat('#5b4030'), MAX)
  // hiver : houppiers resserrés vers le haut du tronc (arbres nus, `uCrownSize`)
  // et sapins blanchis (`uSnow`)
  const winter = { uCrownSize: { value: 1 }, uSnow: { value: 0 }, uSnowColor: { value: SNOW } }
  const crownMat = new MeshLambertMaterial({ flatShading: true })
  crownMat.onBeforeCompile = (shader) => {
    shader.uniforms.uCrownSize = winter.uCrownSize
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uCrownSize;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed = vec3(0.0, 1.3, 0.0) + (transformed - vec3(0.0, 1.3, 0.0)) * uCrownSize;'
      )
  }
  const firMat = new MeshLambertMaterial({ flatShading: true })
  firMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = winter.uSnow
    shader.uniforms.uSnowColor = winter.uSnowColor
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnow;\nuniform vec3 uSnowColor;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, uSnow * 0.5);')
  }
  const crowns = new InstancedMesh(crownGeo, crownMat, MAX)
  const firs = new InstancedMesh(firGeo, firMat, MAX)

  const m = new Matrix4()
  const q = new Quaternion()
  const p = new Vector3()
  const s = new Vector3()
  const up = new Vector3(0, 1, 0)
  const c = new Color()
  const leafy = [] // { x, y, z, r, v, jitter } par feuillu, dans l'ordre des instances
  let firCount = 0

  for (let tries = 0; tries < 300000 && leafy.length + firCount < MAX; tries++) {
    const x = (rand() - 0.5) * 300
    const z = -90 + rand() * 135 // pas trop près de la caméra
    // relief de fond seulement : la forêt (base < 6.5) n'atteint jamais la zone
    // rocheuse (base > 8), où sampleTerrain ajouterait du détail
    const h = groundBase(x, z)
    if (rand() > forestDensity(x, z, h)) continue

    // pas d'arbres sur les pentes trop raides
    if (slope(x, z, h) > 0.9) continue
    // ni dans l'eau, ni les pieds dans la grève, ni au chalet ou dans les camps
    if (isBlocked(x, z, h, 1.5)) continue

    const k = 0.16 + rand() * 0.16 // petits par rapport à l'échelle de la montagne
    const sy = k * (0.85 + rand() * 0.4)
    p.set(x, h - 0.05, z)
    // sapins : en haut des forêts, par bosquets (tache de bruit à part)
    const fir = h > 4.5 && noise(x * 0.09 + 5.3, z * 0.09 - 3.7) > 0.6
    if (fir) {
      q.identity()
      s.set(k, sy, k)
      m.compose(p, q, s)
      firs.setMatrixAt(firCount, m)
      c.copy(TREE).offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.08)
      firs.setColorAt(firCount, c)
      firCount++
    } else {
      q.setFromAxisAngle(up, rand() * Math.PI * 2) // houppiers tous différents
      const w = k * (0.9 + rand() * 0.3) // houppier plus ou moins large
      s.set(w, sy, w)
      m.compose(p, q, s)
      const i = leafy.length
      trunks.setMatrixAt(i, m)
      crowns.setMatrixAt(i, m)
      leafy.push({ x, y: h - 0.05 + 2.25 * sy, z, r: w, v: rand(), jitter: (rand() - 0.5) * 0.08 })
    }
  }

  trunks.count = crowns.count = leafy.length
  firs.count = firCount
  const group = new Group()
  group.add(trunks, crowns, firs)
  for (const mesh of [trunks, crowns, firs]) mesh.frustumCulled = false // arbres partout

  // Couleurs des houppiers : `from` (état au départ d'une transition) → `to`
  // (saison visée), mélangées dans `instanceColor` (gardé côté JS pour ça).
  const n = leafy.length
  for (let i = 0; i < n; i++) crowns.setColorAt(i, c.set(crownColor('ete', leafy[i].v)))
  const current = crowns.instanceColor.array
  const from = new Float32Array(n * 3)
  const to = new Float32Array(n * 3)
  freeAfterUpload(trunks)
  freeAfterUpload(firs)
  crowns.geometry.computeBoundingSphere()

  // nouvelle cible : on part des couleurs affichées en ce moment
  const target = (season) => {
    from.set(current.subarray(0, n * 3))
    for (let i = 0; i < n; i++) {
      c.set(crownColor(season, leafy[i].v)).offsetHSL(0, 0, leafy[i].jitter)
      c.toArray(to, i * 3)
    }
  }
  // e : 0 (from) → 1 (to)
  const setColors = (e) => {
    for (let i = 0; i < n * 3; i++) current[i] = from[i] + (to[i] - from[i]) * e
    crowns.instanceColor.needsUpdate = true
  }
  target('ete')
  setColors(1)

  const setWinter = (snow, crownSize) => {
    winter.uSnow.value = snow
    winter.uCrownSize.value = crownSize
  }
  return { group, target, setColors, setWinter }
}

// Fleurs du printemps : petites touffes colorées (≈ 0,1 de large, un genou de
// randonneur) en taches dans les prairies du bas. Elles poussent en vague
// (`stagger`) quand le printemps arrive et se referment quand il s'en va.
const FLOWER_COLORS = ['#f4f1e8', '#f2c94c', '#e86a8a', '#9b7fd1', '#e85d4a']
function buildFlowers() {
  const MAX = 9000
  const rand = seeded(777)
  const geo = new OctahedronGeometry(0.05) // 8 faces : il y en a beaucoup
  geo.scale(1, 0.6, 1)
  const mesh = new InstancedMesh(geo, new MeshLambertMaterial({ flatShading: true }), MAX)
  const spots = [] // { x, y, z, r, size }
  const c = new Color()
  for (let tries = 0; tries < 400000 && spots.length < MAX; tries++) {
    const x = (rand() - 0.5) * 120
    const z = -40 + rand() * 85
    // taches de fleurs (bruit), dans l'herbe : hors forêt, sous la roche
    if (noise(x * 0.12 - 3.3, z * 0.12 + 8.1) < 0.5) continue
    const h = groundBase(x, z)
    if (h < WATER_LEVEL + 0.3 || h > 8) continue
    if (forestDensity(x, z, h) > 0.3 || slope(x, z, h) > 0.6 || isBlocked(x, z, h, 0.5)) continue
    const i = spots.length
    // une couleur par tache, quelques intruses
    const patch = Math.floor(noise(x * 0.05 + 1.7, z * 0.05 - 6.2) * 10)
    const color = FLOWER_COLORS[(rand() < 0.75 ? patch : Math.floor(rand() * 10)) % FLOWER_COLORS.length]
    mesh.setColorAt(i, c.set(color))
    spots.push({ x, y: sampleTerrain(x, z).h + 0.02, z, r: rand(), size: 0.7 + rand() * 0.6 })
  }
  mesh.count = spots.length
  mesh.frustumCulled = false
  mesh.visible = false

  const m = new Matrix4()
  const q = new Quaternion()
  const p = new Vector3()
  const sc = new Vector3()
  let last = -1
  const update = (amount) => {
    if (amount === last) return
    last = amount
    mesh.visible = amount > 0
    if (!mesh.visible) return
    for (let i = 0; i < spots.length; i++) {
      const f = spots[i]
      const k = stagger(amount, f.r) * f.size
      p.set(f.x, f.y, f.z)
      m.compose(p, q, sc.set(k, k, k))
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  return { mesh, update, count: spots.length }
}

// Randonneurs : petits personnages (jambes, buste, tête, sac à dos) en
// InstancedMesh, qui se baladent en petits groupes dans les prairies du bas.
function buildHikers() {
  const rand = seeded(777)
  const SPEED = 0.35
  const GAP = 0.8 // écart entre membres d'un groupe (× échelle de la zone)
  const SIDES = [-1, 1]
  const JACKETS = JACKET_COLORS.map((c) => new Color(c))
  const PACKS = ['#e08a3c', '#2f6d4a', '#3b3f46', '#b8452f'].map((c) => new Color(c))

  // deux zones de balade, chacune dans le champ de la caméra :
  // - vallée : prairies basses, peu pentues, hors forêt
  // - sommets : roche et neige, le long des crêtes (plus loin → personnages
  //   un peu agrandis pour rester lisibles)
  const ZONES = [
    {
      groups: 20,
      scale: 0.9,
      xMax: 55,
      zMin: -15,
      zMax: 42,
      ok: (x, z, base, h) =>
        base <= 6 && forestDensity(x, z, base) <= 0.35 && slope(x, z, h, 0.5) < 0.5,
    },
    {
      groups: 10,
      scale: 1.6,
      xMax: 70,
      zMin: -80,
      zMax: -15,
      ok: (x, z, base, h) => base >= 18 && slope(x, z, h, 0.5) < 1,
    },
  ]

  const walkable = (zone, x, z) => {
    if (z < zone.zMin || z > zone.zMax || Math.abs(x) > zone.xMax) return false
    const { base, h } = sampleTerrain(x, z)
    return !isBlocked(x, z, h, 0) && zone.ok(x, z, base, h)
  }

  // au moins 6 destinations sur 8 essais — on s'arrête dès que l'issue est connue
  const hasRoom = (h) => {
    let ok = 0
    for (let i = 0; i < 8; i++) {
      if (pickTarget(h)) ok++
      if (ok >= 6) return true
      if (i + 1 - ok > 2) return false
    }
    return false
  }

  // groupes de 1 à 3 randonneurs : un meneur, les autres le suivent
  const hikers = []
  for (const zone of ZONES) {
    for (let groups = 0, tries = 0; groups < zone.groups && tries < 20000; tries++) {
      const x = (rand() - 0.5) * 2 * zone.xMax
      const z = zone.zMin + rand() * (zone.zMax - zone.zMin)
      if (!walkable(zone, x, z)) continue
      const heading = rand() * Math.PI * 2
      const gap = GAP * zone.scale
      const leader = { zone, x, z, heading, phase: rand() * 6 }
      // on évite les petites poches isolées où il tournerait en rond :
      // il faut de la place pour marcher dans plusieurs directions
      if (!hasRoom(leader)) continue
      hikers.push(leader)
      const size = 1 + Math.floor(rand() * 3)
      for (let rank = 1; rank < size; rank++) {
        hikers.push({
          zone,
          x: x - Math.sin(heading) * gap * rank,
          z: z - Math.cos(heading) * gap * rank,
          heading,
          leader,
          rank,
          phase: rand() * 6,
        })
      }
      groups++
    }
  }
  const n = hikers.length
  // météo : tirage fixe de chacun (reste dehors si r < part voulue) et présence
  // animée 0..1 (il rapetisse en s'enfonçant en partant) ; parapluie ouvert 0..1
  for (const h of hikers) {
    h.r = h.leader ? h.leader.r : rand() // un groupe part ou reste ensemble
    h.presence = 1
  }
  let share = 1
  let umbrellasWanted = false
  let umbrella = 0

  const group = new Group()
  const part = (geo, count, color) => {
    const mesh = new InstancedMesh(geo, new MeshLambertMaterial({ color }), count)
    mesh.frustumCulled = false // les instances bougent : la sphère englobante serait périmée
    group.add(mesh)
    return mesh
  }
  // origine des personnages aux pieds, regard vers +z ; jambes pivotent à la hanche
  const legs = part(new BoxGeometry(0.045, 0.18, 0.05).translate(0, -0.09, 0), n * 2, PANTS_COLOR)
  const torso = part(new BoxGeometry(0.13, 0.17, 0.08).translate(0, 0.265, 0), n, '#ffffff')
  const head = part(new IcosahedronGeometry(0.05, 0).translate(0, 0.4, 0), n, SKIN_COLOR)
  const pack = part(new BoxGeometry(0.12, 0.19, 0.07).translate(0, 0.29, -0.075), n, '#ffffff')
  // parapluie : toile conique (Ø ≈ 0,42) tenue au-dessus de la tête, manche fin
  const canopy = part(new ConeGeometry(0.21, 0.1, 8), n, '#ffffff')
  const stick = part(new BoxGeometry(0.012, 0.3, 0.012), n, '#3a3a3a')
  const UMBRELLAS = ['#2b2f6b', '#c8553d', '#e0b23c', '#2f8f6a', '#26292e', '#7a4fb0'].map((c) => new Color(c))
  for (let i = 0; i < n; i++) {
    torso.setColorAt(i, JACKETS[Math.floor(rand() * JACKETS.length)])
    pack.setColorAt(i, PACKS[Math.floor(rand() * PACKS.length)])
    canopy.setColorAt(i, UMBRELLAS[Math.floor(rand() * UMBRELLAS.length)])
  }
  const HIDDEN = new Matrix4().makeScale(0, 0, 0)
  const umb = new Matrix4()

  const body = new Matrix4()
  const leg = new Matrix4()
  const m = new Matrix4()
  const e = new Euler()
  const q = new Quaternion()
  const p = new Vector3()
  const s = new Vector3()

  // prochaine destination : de préférence devant soi (balade naturelle),
  // sinon n'importe où autour ; le segment doit être praticable sur toute sa longueur
  function pickTarget(h) {
    const k = h.zone.scale
    for (let i = 0; i < 30; i++) {
      const spread = i < 20 ? Math.PI * 0.7 : Math.PI * 2
      const a = h.heading + (Math.random() - 0.5) * spread
      const dist = (3 + Math.random() * 9) * k
      const tx = h.x + Math.sin(a) * dist
      const tz = h.z + Math.cos(a) * dist
      const steps = Math.ceil(dist / (0.6 * k))
      let clear = true
      for (let j = 1; j <= steps && clear; j++) {
        clear = walkable(h.zone, h.x + (tx - h.x) * (j / steps), h.z + (tz - h.z) * (j / steps))
      }
      if (clear) return { x: tx, z: tz }
    }
    return null
  }

  // avance h vers (tx, tz) d'au plus maxStep
  function stepToward(h, tx, tz, maxStep) {
    const dx = tx - h.x
    const dz = tz - h.z
    const d = Math.hypot(dx, dz)
    if (!d) return
    const step = Math.min(d, maxStep)
    h.x += (dx / d) * step
    h.z += (dz / d) * step
  }

  function update(dt) {
    umbrella = approach(umbrella, umbrellasWanted ? 1 : 0, dt, 0.8)
    for (let i = 0; i < n; i++) {
      const h = hikers[i]
      const k = h.zone.scale
      // chacun part (ou revient) à son rythme
      h.presence = approach(h.presence, h.r < share ? 1 : 0, dt, 0.9 + h.r * 1.4)
      if (!h.leader) {
        // marche de point en point : chaque destination est choisie avec un
        // trajet en ligne droite entièrement praticable, donc jamais de blocage
        if (!h.target || Math.hypot(h.target.x - h.x, h.target.z - h.z) < 0.3 * k) {
          // cul-de-sac : demi-tour vers le point de départ du trajet (forcément praticable)
          const next = pickTarget(h) || h.from
          h.from = { x: h.x, z: h.z }
          h.target = next
        }
        if (h.target) {
          const want = Math.atan2(h.target.x - h.x, h.target.z - h.z)
          let diff = want - h.heading
          diff = Math.atan2(Math.sin(diff), Math.cos(diff)) // ramené dans [-π, π]
          h.heading += Math.max(-3 * dt, Math.min(3 * dt, diff)) // virage progressif
          // il finit de se tourner, puis avance pile sur le segment vérifié
          if (Math.abs(diff) < 0.6) stepToward(h, h.target.x, h.target.z, SPEED * k * dt)
        }
      } else {
        // suit le meneur à distance
        const L = h.leader
        const tx = L.x - Math.sin(L.heading) * GAP * k * h.rank
        const tz = L.z - Math.cos(L.heading) * GAP * k * h.rank
        if (Math.hypot(tx - h.x, tz - h.z) > 0.02) {
          h.heading = Math.atan2(tx - h.x, tz - h.z)
          stepToward(h, tx, tz, SPEED * 1.2 * k * dt)
        }
      }
      h.phase += dt * 7

      // petit rebond + balancement de la marche
      const bob = Math.abs(Math.sin(h.phase)) * 0.02 * k
      e.set(0, h.heading, Math.sin(h.phase) * 0.05)
      q.setFromEuler(e)
      const here = h.presence
      p.set(h.x, sampleTerrain(h.x, h.z).h + bob - (1 - here) * 0.3 * k, h.z)
      s.setScalar(k * here)
      body.compose(p, q, s)
      // parapluie dans la main droite, toile au-dessus de la tête
      if (umbrella > 0 && here > 0) {
        umb.makeScale(umbrella, umbrella, umbrella).setPosition(0.07, 0.64, 0.02)
        canopy.setMatrixAt(i, m.multiplyMatrices(body, umb))
        umb.makeScale(1, umbrella, 1).setPosition(0.07, 0.48, 0.02)
        stick.setMatrixAt(i, m.multiplyMatrices(body, umb))
      } else {
        canopy.setMatrixAt(i, HIDDEN)
        stick.setMatrixAt(i, HIDDEN)
      }
      torso.setMatrixAt(i, body)
      head.setMatrixAt(i, body)
      pack.setMatrixAt(i, body)
      for (const side of SIDES) {
        leg.makeRotationX(Math.sin(h.phase) * 0.5 * side).setPosition(side * 0.035, 0.18, 0)
        legs.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), m.multiplyMatrices(body, leg))
      }
    }
    for (const mesh of group.children) mesh.instanceMatrix.needsUpdate = true
  }

  // part des randonneurs dehors (0..1) et parapluies ; `now` : sans transition
  function setCrowd({ hikers: part, umbrellas }, now = false) {
    share = part
    umbrellasWanted = umbrellas
    // hors de vue (la nuit, update ne tourne pas) : déjà en place au retour du jour
    if (now || !group.visible) {
      umbrella = umbrellas ? 1 : 0
      for (const h of hikers) h.presence = h.r < share ? 1 : 0
    }
  }

  return { group, update, setCrowd }
}

// Surface du lac : un disque plat, sans vrai reflet (trop coûteux : il faudrait
// rendre la scène deux fois). Le scintillement vient des normales perturbées
// dans le shader, et la brillance du soleil fait le reste.
// Glace du lac (hiver) : disque blanc bleuté posé sur l'eau, en fondu selon `ice`.
function buildIce() {
  const geo = new CircleGeometry(1, 48)
  geo.rotateX(-Math.PI / 2)
  geo.scale(LAKE.rx * 0.97, 1, LAKE.rz * 0.97)
  const mat = new MeshLambertMaterial({ color: '#dbe7ee', transparent: true, opacity: 0, depthWrite: false })
  const mesh = new Mesh(geo, mat)
  mesh.position.set(LAKE.x, WATER_LEVEL + 0.02, LAKE.z)
  mesh.visible = false
  const set = (ice) => {
    mat.opacity = 0.92 * ice
    mesh.visible = ice > 0
  }
  return { mesh, set }
}

function buildLake() {
  const geo = new CircleGeometry(1, 48)
  geo.rotateX(-Math.PI / 2)
  geo.scale(LAKE.rx, 1, LAKE.rz) // la rive (d ≲ 0.9) reste dans l'ellipse
  const mat = new MeshPhongMaterial({
    color: '#5d8e94',
    specular: '#ffe6c4',
    shininess: 70,
    transparent: true,
    opacity: 0.82,
  })
  const time = { value: 0 }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec2 vWPos;\nvoid main() {')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xz;'
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uTime;\nvarying vec2 vWPos;\nvoid main() {')
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        normal = normalize(normal + vec3(
          sin(vWPos.x * 1.7 + uTime * 1.3) * 0.035 + sin(vWPos.y * 0.9 - uTime * 0.8) * 0.025,
          0.0,
          sin(vWPos.y * 2.3 - uTime * 1.1) * 0.035 + sin((vWPos.x + vWPos.y) * 1.1 + uTime) * 0.02
        ));`
      )
  }
  const mesh = new Mesh(geo, mat)
  mesh.position.set(LAKE.x, WATER_LEVEL, LAKE.z)
  return { mesh, update: (t) => (time.value = t) }
}

// ---------- petits objets low-poly (chalet, camps, personnages) ----------
// Palette commune des personnages (randonneurs, campeurs, pêcheur)
const JACKET_COLORS = ['#c8553d', '#3d6fc8', '#e0b23c', '#7a4fb0', '#d9663a']
const PANTS_COLOR = '#2f3436'
const SKIN_COLOR = '#e8c4a0'
// Seuil de `night` lissé où la scène bascule : les objets de jour (randonneurs,
// pêcheur) disparaissent et ceux de nuit (camps) apparaissent, scène déjà sombre.
const NIGHT_SWITCH = 0.5
// Installation d'un camp, en secondes depuis la tombée de la nuit : les campeurs
// arrivent, montent les tentes puis allument le feu. Le matin, tout se défait
// dans l'ordre inverse, un peu plus vite.
const CAMP = {
  arrive: { start: 0, step: 0.5, length: 3.4 }, // marche jusqu'au feu puis s'assoit
  pitch: { start: 2.2, step: 0.8, length: 1.6 }, // une tente après l'autre
  fire: { start: 4.6, length: 1.8 }, // flammes qui prennent
  teardown: 1.4, // vitesse du démontage
}
const CAMP_DONE = 6.4 // tout est installé (dernier montage et feu terminés)

function addMesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geo, material)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}

// Géométries partagées par tous les personnages assis
const SEATED = {
  torso: new BoxGeometry(0.13, 0.17, 0.08),
  head: new IcosahedronGeometry(0.05, 0),
  thigh: new BoxGeometry(0.045, 0.045, 0.15),
  shin: new BoxGeometry(0.045, 0.1, 0.045),
}

// Personnage assis (origine aux hanches, regard vers +z) : buste, tête, cuisses.
// L'appelant ajoute le reste (jambes, bras, chapeau…).
function buildSeatedPerson(jacket, pants, skin) {
  const person = new Group()
  addMesh(person, SEATED.torso, jacket, 0, 0.09, 0).rotation.x = 0.15
  addMesh(person, SEATED.head, skin, 0, 0.23, 0.01)
  for (const side of [-1, 1]) addMesh(person, SEATED.thigh, pants, side * 0.035, 0, 0.075)
  return person
}

// Campeur articulé (origine aux hanches, regard vers +z) : il marche debout puis
// s'assoit en pliant les genoux. Matériaux propres à chacun, transparents, pour
// qu'il apparaisse et s'efface en fondu au loin.
const CAMPER = {
  thigh: new BoxGeometry(0.045, 0.12, 0.045).translate(0, -0.06, 0), // pivot à la hanche
  shin: new BoxGeometry(0.045, 0.11, 0.045).translate(0, -0.055, 0), // pivot au genou
  standing: 0.22, // hauteur des hanches debout
  seated: 0.08, // et assis
}
function buildCamper(jacket, pants, skin) {
  const mats = [jacket, pants, skin].map((m) => {
    const c = m.clone()
    c.transparent = true
    return c
  })
  const [JACKET, PANTS, SKIN] = mats
  const body = new Group()
  const torso = addMesh(body, SEATED.torso, JACKET, 0, 0.09, 0)
  addMesh(body, SEATED.head, SKIN, 0, 0.23, 0.01)
  const legs = [-1, 1].map((side) => {
    const thigh = addMesh(body, CAMPER.thigh, PANTS, side * 0.035, 0, 0)
    const shin = addMesh(thigh, CAMPER.shin, PANTS, 0, -0.12, 0)
    return { thigh, shin, side }
  })
  // stride : phase du pas ; sit : 0 debout → 1 assis
  const pose = (stride, sit) => {
    body.position.y = CAMPER.standing + (CAMPER.seated - CAMPER.standing) * sit
    body.position.y += (1 - sit) * Math.abs(Math.sin(stride)) * 0.012 // léger rebond du pas
    torso.rotation.x = 0.15 * sit
    for (const { thigh, shin, side } of legs) {
      const swing = Math.sin(stride) * side * 0.55 * (1 - sit)
      const bend = Math.max(0, Math.sin(stride) * side) * 0.6 * (1 - sit)
      thigh.rotation.x = swing - (Math.PI / 2) * sit // assis : cuisse à l'horizontale
      shin.rotation.x = bend + (Math.PI / 2) * sit // et tibia à la verticale
    }
  }
  const fade = (opacity) => {
    for (const m of mats) m.opacity = opacity
  }
  return { body, pose, fade }
}

// Libère ce que porte `root` (géométries, matériaux, textures), une seule fois chacun.
function disposeTree(root) {
  const seen = new Set()
  const free = (resource) => {
    if (!resource || seen.has(resource)) return
    seen.add(resource)
    resource.dispose()
  }
  root.traverse((o) => {
    free(o.geometry)
    free(o.material?.map)
    free(o.material)
    if (o.isInstancedMesh) o.dispose() // attributs d'instance
  })
}

// Fusionne les meshes statiques sous `root` en un mesh par matériau : des dizaines
// de petits objets → quelques appels de dessin. `keep` : sous-arbres animés,
// laissés tels quels. À appeler une fois `root` entièrement construit.
function mergeStatic(root, keep = []) {
  root.updateMatrixWorld(true)
  const toRoot = new Matrix4().copy(root.matrixWorld).invert()
  const kept = (o) => {
    for (let p = o; p && p !== root; p = p.parent) if (keep.includes(p)) return true
    return false
  }
  const byMaterial = new Map()
  const merged = []
  root.traverse((o) => {
    if (!o.isMesh || kept(o)) return
    // toutes les géométries en non indexé : sinon elles ne se fusionnent pas
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
    geo.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, o.matrixWorld))
    if (!byMaterial.has(o.material)) byMaterial.set(o.material, [])
    byMaterial.get(o.material).push(geo)
    merged.push(o)
  })
  for (const o of merged) o.removeFromParent()
  for (const [material, geos] of byMaterial) {
    root.add(new Mesh(mergeGeometries(geos), material))
    for (const g of geos) g.dispose()
  }
}

// Chalet en rondins low-poly, façade tournée vers le lac, avec son ponton.
// Arbre près du chalet, en fleurs roses au printemps (vert l'été, roux l'automne) :
// tronc et quelques boules de feuillage, dont deux plus claires.
function buildBlossomTree() {
  const group = new Group()
  const leaves = flatMat('#4f8a48')
  const light = flatMat('#4f8a48')
  addMesh(group, new CylinderGeometry(0.07, 0.12, 1.2, 5).translate(0, 0.6, 0), flatMat('#5b4030'))
  for (const [r, x, y, z, mat] of [
    [0.5, 0, 1.55, 0, leaves],
    [0.42, 0.36, 1.35, 0.14, leaves],
    [0.4, -0.33, 1.4, -0.1, leaves],
    [0.34, 0.05, 1.9, -0.06, light],
    [0.3, -0.12, 1.3, 0.34, light],
  ]) {
    addMesh(group, new IcosahedronGeometry(r, 0), mat, x, y, z)
  }
  group.position.set(BLOSSOM.x, sampleTerrain(BLOSSOM.x, BLOSSOM.z).h - 0.08, BLOSSOM.z)
  group.rotation.y = 0.6
  const WHITE = new Color('#ffffff')
  const setColor = (c) => {
    leaves.color.copy(c)
    light.color.copy(c).lerp(WHITE, 0.18)
  }
  return { group, setColor }
}

function buildChalet() {
  const group = new Group()
  const WOOD = flatMat('#7a4e32')
  const DARK_WOOD = flatMat('#4b3022')
  const STONE = flatMat('#6d6a62')
  const ROOF = flatMat('#46403b')
  const WINDOW = flatMat('#f3d38a', '#d9a441') // lumière chaude à l'intérieur

  // repère local : origine au sol, façade vers +z
  addMesh(group, new BoxGeometry(1.9, 1.2, 1.6), WOOD, 0, 0.6, 0)
  addMesh(group, new BoxGeometry(2.1, 1.5, 1.8), STONE, 0, -0.75, 0) // soubassement : rattrape la pente
  // toit à deux pans : prisme (cylindre à 3 faces) couché le long de z, pointe en haut
  const roof = new CylinderGeometry(1.4, 1.4, 2.1, 3, 1)
  roof.rotateX(-Math.PI / 2)
  roof.scale(1, 0.55, 1)
  addMesh(group, roof, ROOF, 0, 1.2 + 0.7 * 0.55, 0)
  // neige sur le toit (hiver) : même prisme un peu plus grand, en fondu
  const roofSnowMat = new MeshLambertMaterial({ color: SNOW, flatShading: true, transparent: true, opacity: 0 })
  const roofSnow = new CylinderGeometry(1.46, 1.46, 2.18, 3, 1)
  roofSnow.rotateX(-Math.PI / 2)
  roofSnow.scale(1, 0.57, 1)
  const snowCap = addMesh(group, roofSnow, roofSnowMat, 0, 1.2 + 0.7 * 0.55 + 0.03, 0)
  snowCap.visible = false
  addMesh(group, new BoxGeometry(0.25, 0.7, 0.25), STONE, 0.5, 1.75, -0.4) // cheminée
  addMesh(group, new BoxGeometry(0.34, 0.72, 0.04), DARK_WOOD, 0, 0.36, 0.81) // porte
  // fenêtre encadrée de bois ; `side` = posée sur un mur latéral (normale ±x).
  // La vitre dépasse un peu du cadre, qui ne reste visible qu'en bordure.
  // La nuit, un léger halo devant chaque vitre (masqué par les murs côté caché),
  // un peu plus large que haut comme la fenêtre.
  const glow = buildOrb(
    [
      [0, 'rgba(255, 210, 140, 0.7)'],
      [0.25, 'rgba(255, 175, 90, 0.28)'],
      [0.6, 'rgba(255, 150, 60, 0.06)'],
      [1, 'rgba(255, 150, 60, 0)'],
    ],
    1,
    { additive: true, size: 64 }
  )
  glow.scale.set(1.05, 0.85, 1)
  const halos = new Group() // allumés ensemble la nuit
  group.add(halos)
  const windowAt = (x, y, z, side = false) => {
    addMesh(group, new BoxGeometry(...(side ? [0.03, 0.38, 0.4] : [0.4, 0.38, 0.03])), DARK_WOOD, x, y, z)
    addMesh(group, new BoxGeometry(...(side ? [0.05, 0.28, 0.3] : [0.3, 0.28, 0.05])), WINDOW, x, y, z)
    const halo = glow.clone() // même matériau : une seule opacité à piloter
    halo.position.set(x + (side ? Math.sign(x) * 0.12 : 0), y, z + (side ? 0 : Math.sign(z) * 0.12))
    halos.add(halo)
  }
  for (const s of [-1, 1]) {
    windowAt(s * 0.55, 0.68, 0.8) // façade, de part et d'autre de la porte
    windowAt(s * 0.45, 0.68, -0.8) // arrière
    windowAt(0.95, 0.68, s * 0.4, true) // murs latéraux
    windowAt(-0.95, 0.68, s * 0.4, true)
  }
  windowAt(0, 1.5, 1.05) // pignon, sous la pointe du toit

  // ponton : part de la rive vers le large, juste au-dessus de l'eau
  const ground = sampleTerrain(CHALET.x, CHALET.z).h
  const deck = WATER_LEVEL + 0.15 - ground
  addMesh(group, new BoxGeometry(0.6, 0.08, 4), DARK_WOOD, 0.3, deck, 3.2)
  for (const side of [-1, 1]) {
    addMesh(group, new BoxGeometry(0.1, 1.2, 0.1), DARK_WOOD, 0.3 + side * 0.25, deck - 0.6, 5)
  }

  // Pêcheur assis au bout du ponton, jambes au-dessus de l'eau (objet de jour :
  // la nuit, il est rentré au chalet).
  const FISHER_SCALE = 1.7 // un peu grossi pour rester lisible à cette distance
  const PANTS = flatMat(PANTS_COLOR)
  const JACKET = flatMat(JACKET_COLORS[0]) // veste rouge : se détache sur l'eau
  const HAT = flatMat('#c9a66b')
  const fisher = buildSeatedPerson(JACKET, PANTS, flatMat(SKIN_COLOR))
  fisher.position.set(0.3, deck + 0.04, 5.05)
  fisher.scale.setScalar(FISHER_SCALE)
  group.add(fisher)
  addMesh(fisher, new CylinderGeometry(0.06, 0.065, 0.045, 8), HAT, 0, 0.285, 0.01) // bob
  addMesh(fisher, new CylinderGeometry(0.1, 0.1, 0.01, 10), HAT, 0, 0.265, 0.01)
  for (const side of [-1, 1]) {
    addMesh(fisher, new BoxGeometry(0.045, 0.16, 0.045), PANTS, side * 0.035, -0.08, 0.15) // jambes pendantes
    addMesh(fisher, new BoxGeometry(0.04, 0.04, 0.14), JACKET, side * 0.06, 0.13, 0.07) // bras tendus
  }
  // canne : pivote au niveau des mains ; la ligne pend à la verticale jusqu'à l'eau
  const ROD = 1
  const ROD_TILT = -0.6 // inclinaison de repos de la canne
  const HANDS = { y: 0.12, z: 0.14 }
  const waterY = (WATER_LEVEL - (ground + deck + 0.04)) / FISHER_SCALE
  const rod = new Group()
  rod.position.set(0, HANDS.y, HANDS.z)
  fisher.add(rod)
  addMesh(rod, new BoxGeometry(0.012, 0.012, ROD).translate(0, 0, ROD / 2), DARK_WOOD)
  const line = addMesh(fisher, new BoxGeometry(0.005, 1, 0.005), flatMat('#e8e8e0'))
  const float = addMesh(fisher, new IcosahedronGeometry(0.025, 0), flatMat('#d23a2a')) // bouchon
  const fish = buildFishJump({ water: waterY, z: HANDS.z + Math.cos(ROD_TILT) * ROD })
  fisher.add(fish.object)
  // parapluie planté contre lui (les mains tiennent la canne), ouvert sous la pluie
  const umbrella = new Group()
  umbrella.position.set(0.09, 0, -0.06)
  umbrella.rotation.z = -0.15
  fisher.add(umbrella)
  addMesh(umbrella, new BoxGeometry(0.01, 0.42, 0.01).translate(0, 0.21, 0), flatMat('#3a3a3a'))
  addMesh(umbrella, new ConeGeometry(0.22, 0.1, 8), flatMat('#2b2f6b'), 0, 0.44, 0)
  umbrella.visible = false
  // présence (pluie : il reste, orage : il rentre) et ouverture du parapluie, 0..1
  let presence = 1
  let wantFisher = true
  let open = 0
  let wantUmbrella = false
  // fumée qui sort de la cheminée, jour et nuit
  const smoke = buildSmoke()
  smoke.object.position.set(0.5, 2.15, -0.4)
  group.add(smoke.object)

  // Lumière ambrée placée DANS le chalet : les murs extérieurs, tournés vers
  // l'extérieur, ne la reçoivent pas ; seuls le sol, la rive et le ponton autour
  // s'éclairent — comme la lumière qui sort par les fenêtres.
  const light = new PointLight('#ffa54f', 0, 10, 2)
  light.position.set(0, 0.6, 0)
  group.add(light)

  group.position.set(CHALET.x, ground, CHALET.z)
  group.rotation.y = Math.atan2(LAKE.x - CHALET.x, LAKE.z - CHALET.z) // face au lac
  const pumpkins = buildPumpkins(group.rotation.y, ground)
  group.add(pumpkins.group)
  mergeStatic(fisher, [rod, line, float, fish.object, umbrella])
  mergeStatic(group, [fisher, pumpkins.group, snowCap])

  // k = 0 (jour) → 1 (nuit) ; léger vacillement, comme un feu dans la cheminée
  const update = (k, t, dt = 0) => {
    presence = approach(presence, wantFisher ? 1 : 0, dt, 1.2)
    open = approach(open, wantUmbrella ? 1 : 0, dt, 0.8)
    // la nuit il est rentré ; sous l'orage il rapetisse… et rentre aussi
    fisher.visible = k < NIGHT_SWITCH && presence > 0
    fisher.scale.setScalar(FISHER_SCALE * presence)
    umbrella.visible = open > 0
    umbrella.scale.setScalar(open)
    if (fisher.visible) {
      // la canne monte et descend doucement, la ligne suit le bout de la canne
      const tilt = ROD_TILT + 0.04 * Math.sin(t * 1.3) + 0.015 * Math.sin(t * 3.7)
      rod.rotation.x = tilt
      const tipY = HANDS.y - Math.sin(tilt) * ROD
      const tipZ = HANDS.z + Math.cos(tilt) * ROD
      line.position.set(0, (tipY + waterY) / 2, tipZ)
      line.scale.y = tipY - waterY
      float.position.set(0, waterY + 0.01 * Math.sin(t * 2.1), tipZ)
      fish.update(t)
    }

    const flicker = 1 + 0.04 * Math.sin(t * 4.7) * Math.sin(t * 1.9) + 0.015 * Math.sin(t * 11.3)
    light.intensity = 30 * k * flicker
    WINDOW.emissiveIntensity = 1 + 1.6 * k // fenêtres bien allumées la nuit
    smoke.update(k, t, snow) // fumée plus épaisse l'hiver
    glow.material.opacity = k * flicker
    halos.visible = k > 0
    pumpkins.update(k, t)
  }
  // `now` : sans transition (scène arrêtée)
  const setCrowd = ({ fisher: stays, umbrellas }, now = false) => {
    wantFisher = stays
    wantUmbrella = umbrellas
    if (now) {
      presence = stays ? 1 : 0
      open = umbrellas ? 1 : 0
    }
  }
  // aspect de saison : citrouilles, neige (toit, fumée), décor d'hiver
  let snow = 0
  let decor = 0
  const setSeason = (look) => {
    pumpkins.setAmount(look.pumpkins)
    snow = look.snow
    decor = look.decor
    roofSnowMat.opacity = snow
    snowCap.visible = snow > 0
  }
  return { group, update, fisher, setCrowd, setSeason }
}

// Citrouilles d'Halloween autour du chalet, du côté vu par la caméra (arrière
// gauche dans le repère du chalet, façade vers +z). À hauteur de genou (≈ 0,12),
// visage tourné vers la caméra ; la nuit, il s'allume comme une lanterne. Elles
// poussent / s'en vont en vague (`stagger`) selon `amount` (0..1).
const PUMPKIN_SPOTS = [
  [-1.3, -0.25],
  [-1.25, -0.8],
  [-0.8, -1.2],
  [-1.35, 0.35],
  [-0.2, -1.25],
]
function buildPumpkins(yaw, chaletGround) {
  const group = new Group()
  const BODY = flatMat('#e0782a')
  const STEM = flatMat('#5a4a22')
  const FACE = flatMat('#3a1c08', '#ffb347') // creusé : sombre le jour, allumé la nuit
  const body = new SphereGeometry(1, 8, 6).scale(0.075, 0.06, 0.075).translate(0, 0.06, 0)
  const halo = buildOrb(
    [
      [0, 'rgba(255, 190, 90, 0.75)'],
      [0.3, 'rgba(255, 140, 40, 0.25)'],
      [1, 'rgba(255, 120, 30, 0)'],
    ],
    0.45,
    { additive: true, size: 64 }
  )
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const items = PUMPKIN_SPOTS.map(([lx, lz], i) => {
    const pumpkin = new Group()
    const wx = CHALET.x + lx * cos + lz * sin
    const wz = CHALET.z - lx * sin + lz * cos
    pumpkin.position.set(lx, sampleTerrain(wx, wz).h - chaletGround - 0.01, lz)
    // visage vers la caméra (côté +z du monde, x ≈ 0)
    pumpkin.rotation.y = Math.atan2(0 - wx, 78 - wz) - yaw
    addMesh(pumpkin, body, BODY)
    addMesh(pumpkin, new BoxGeometry(0.014, 0.03, 0.014), STEM, 0, 0.13, 0)
    for (const side of [-1, 1]) addMesh(pumpkin, new BoxGeometry(0.018, 0.016, 0.01), FACE, side * 0.024, 0.075, 0.071)
    addMesh(pumpkin, new BoxGeometry(0.05, 0.012, 0.01), FACE, 0, 0.045, 0.073)
    const light = halo.clone() // même matériau : une seule opacité à piloter
    light.position.set(0, 0.07, 0.1)
    pumpkin.add(light)
    pumpkin.visible = false
    group.add(pumpkin)
    return { pumpkin, r: (i * 0.37) % 1 }
  })
  let amount = 0
  let want = 0
  const setAmount = (a) => (want = a)
  const update = (k, t) => {
    amount = want
    const flicker = 1 + 0.08 * Math.sin(t * 6.1) * Math.sin(t * 2.3)
    FACE.emissiveIntensity = 1.8 * k * flicker
    halo.material.opacity = 0.9 * k * flicker
    for (const { pumpkin, r } of items) {
      const g = stagger(amount, r)
      pumpkin.visible = g > 0
      pumpkin.scale.setScalar(g)
    }
  }
  return { group, update, setAmount }
}

// Soleil et lune : sprites peints sur un canvas, en haut à droite au-dessus des
// sommets. Ils suivent la caméra (astres « à l'infini », ils ne glissent pas avec
// la parallaxe) et les montagnes passent devant grâce au test de profondeur.
const SUN_OFFSET = new Vector3(82, 63, -328) // depuis la caméra

// Course d'un astre sur un arc : p = 0 lever (sous les crêtes, à gauche),
// 0.5 = position haute (SUN_OFFSET), 1 = coucher (sous les crêtes, à droite).
// Les montagnes passent devant l'astre quand il descend derrière elles.
const ARC_WIDTH = 120
const ARC_DROP = 150
function placeOnArc(sprite, p) {
  const u = (p - 0.5) * 2 // -1 … 1
  sprite.position.set(SUN_OFFSET.x + u * ARC_WIDTH, SUN_OFFSET.y - ARC_DROP * u * u, SUN_OFFSET.z)
}

// `paint` : dessin en plus du dégradé ; `additive` : lueur qui s'ajoute à la scène ;
// `size` : résolution de la texture (petite pour les halos, petits à l'écran)
function buildOrb(stops, scale, { paint, additive = false, size = 256 } = {}) {
  const map = canvasTexture(size, size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    for (const [at, color] of stops) g.addColorStop(at, color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    paint?.(ctx, size)
  })
  // pas de brouillard : sinon l'astre se fondrait dans le ciel
  const material = new SpriteMaterial({ map, fog: false, depthWrite: false })
  if (additive) material.blending = AdditiveBlending
  const sprite = new Sprite(material)
  sprite.scale.setScalar(scale)
  return sprite
}

const buildSun = () =>
  buildOrb(
    [
      [0, 'rgba(255, 249, 232, 1)'],
      [0.15, 'rgba(255, 240, 205, 1)'],
      [0.19, 'rgba(255, 206, 128, 0.55)'],
      [0.45, 'rgba(255, 196, 120, 0.16)'],
      [1, 'rgba(255, 196, 120, 0)'],
    ],
    70
  )

const buildMoon = () =>
  buildOrb(
    [
      [0, 'rgba(246, 247, 255, 1)'],
      [0.12, 'rgba(232, 237, 252, 1)'],
      [0.14, 'rgba(170, 190, 240, 0.32)'],
      [0.4, 'rgba(140, 165, 230, 0.08)'],
      [1, 'rgba(140, 165, 230, 0)'],
    ],
    60,
    {
      paint: (ctx, size) => {
        // quelques « mers » lunaires
        ctx.fillStyle = 'rgba(172, 182, 208, 0.6)'
        for (const [x, y, r] of [
          [-0.035, -0.03, 0.035],
          [0.04, 0.015, 0.026],
          [-0.01, 0.05, 0.02],
        ]) {
          ctx.beginPath()
          ctx.arc(size * (0.5 + x), size * (0.5 + y), size * r, 0, Math.PI * 2)
          ctx.fill()
        }
      },
    }
  )

// Étoiles : points sur une calotte devant la caméra, d'éclat aléatoire.
function buildStars() {
  const N = 700
  const R = 340 // dans le champ de la caméra (far = 400)
  const rand = seeded(99)
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const az = (rand() - 0.5) * Math.PI * 0.9
    const el = Math.asin(0.02 + rand() * 0.9)
    pos[i * 3] = Math.cos(el) * Math.sin(az) * R
    pos[i * 3 + 1] = Math.sin(el) * R
    pos[i * 3 + 2] = -Math.cos(el) * Math.cos(az) * R
    const b = 0.35 + Math.pow(rand(), 3) * 0.65 // surtout des étoiles pâles
    col.set([b * 0.9, b * 0.94, b], i * 3)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('color', new BufferAttribute(col, 3))
  const mat = new PointsMaterial({
    size: 1.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    fog: false,
    depthWrite: false,
  })
  return new Points(geo, mat)
}

// Camps : tentes autour d'un feu, montés pour la nuit. Le jour, il ne reste que
// le foyer éteint (pierres et bûches) ; la nuit, les campeurs reviennent, montent
// les tentes et rallument le feu.
function buildCamps() {
  const rand = seeded(2024)
  const group = new Group()
  const TENTS = ['#d9663a', '#3d6fc8', '#e0b23c', '#2f8f6a'].map((c) => flatMat(c))
  const JACKETS = JACKET_COLORS.map((c) => flatMat(c))
  const WOOD = flatMat('#4b3022')
  const STONE = flatMat('#7d7a72')
  const PANTS = flatMat(PANTS_COLOR)
  const SKIN = flatMat(SKIN_COLOR)
  // flammes : non éclairées et sans brouillard, ce sont elles qui éclairent
  const FLAME_OUT = new MeshBasicMaterial({ color: '#ff8a2a', fog: false })
  const FLAME_IN = new MeshBasicMaterial({ color: '#ffd36b', fog: false })

  // tente pyramidale : silhouette triangulaire sous tous les angles (une tente
  // canadienne vue de côté, depuis notre caméra basse, ressemblait à une caisse)
  const tentGeo = new ConeGeometry(0.72, 0.9, 4)
  tentGeo.translate(0, 0.45, 0)
  // un peu de neige sur le haut des tentes (hiver), montée et pliée avec elles
  const capGeo = new ConeGeometry(0.3, 0.37, 4)
  capGeo.translate(0, 0.54 + 0.185, 0)
  const CAP = new MeshLambertMaterial({ color: SNOW, flatShading: true, transparent: true, opacity: 0 })
  const stoneGeo = new IcosahedronGeometry(0.07, 0)
  const logGeo = new BoxGeometry(0.05, 0.05, 0.42)
  const flameGeo = new ConeGeometry(1, 1, 6)
  flameGeo.translate(0, 0.5, 0) // origine à la base : la flamme grandit vers le haut

  const glow = buildOrb(
    [
      [0, 'rgba(255, 200, 110, 0.9)'],
      [0.2, 'rgba(255, 150, 60, 0.4)'],
      [0.55, 'rgba(255, 120, 40, 0.08)'],
      [1, 'rgba(255, 120, 40, 0)'],
    ],
    2.6,
    { additive: true, size: 64 }
  )

  const fires = []
  const tents = [] // montées / démontées une à une
  const campers = [] // arrivent à pied et s'assoient autour du feu

  for (const c of CAMPS) {
    const camp = new Group()
    camp.position.set(c.x, sampleTerrain(c.x, c.z).h, c.z)
    camp.scale.setScalar(c.scale)
    group.add(camp)
    // la lumière du feu reste sur `camp` (intensité 0 le jour) : masquer une
    // lumière changerait leur nombre et recompilerait tous les shaders
    const campProps = new Group()
    camp.add(campProps)

    // foyer : cercle de pierres + bûches croisées
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      addMesh(campProps, stoneGeo, STONE, Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3)
    }
    for (let i = 0; i < 3; i++) {
      addMesh(campProps, logGeo, WOOD, 0, 0.04, 0).rotation.set(0.25, (i / 3) * Math.PI, 0)
    }
    const outer = addMesh(campProps, flameGeo, FLAME_OUT, 0, 0.03, 0)
    const inner = addMesh(campProps, flameGeo, FLAME_IN, 0, 0.03, 0)
    const light = new PointLight('#ff8a3d', 0, 8, 2)
    light.position.set(0, 0.5, 0)
    camp.add(light)
    const halo = glow.clone()
    halo.position.set(0, 0.35, 0)
    campProps.add(halo)
    // fumée au-dessus des flammes (comme la cheminée du chalet)
    const smoke = buildSmoke({ nightColor: '#8a7a6a' }) // éclairée par les flammes
    smoke.object.position.set(0, 0.35, 0)
    campProps.add(smoke.object)
    fires.push({ outer, inner, light, halo, smoke, phase: rand() * 10 })

    // tentes autour du feu, une arête tournée vers lui ; `doors` : où l'on y entre
    const doors = []
    for (let i = 0; i < c.tents; i++) {
      const a = (i / c.tents) * Math.PI * 2 + rand() * 0.6
      const x = Math.cos(a) * 1.7
      const z = Math.sin(a) * 1.7
      const tent = addMesh(campProps, tentGeo, TENTS[(i + CAMPS.indexOf(c)) % TENTS.length], x, -0.03, z)
      addMesh(tent, capGeo, CAP).visible = false
      tent.rotation.y = Math.atan2(x, z)
      doors.push({ x: Math.cos(a) * 1.25, z: Math.sin(a) * 1.25 })
      tents.push({ mesh: tent, yaw: tent.rotation.y, delay: i * CAMP.pitch.step + rand() * 0.2 })
    }

    // campeurs assis par terre en cercle, face au feu, entre les tentes
    for (let i = 0; i < c.campers; i++) {
      const a = c.seats?.[i] ?? ((i + 0.5) / c.campers) * Math.PI * 2 + rand() * 0.4
      const x = Math.cos(a) * 0.85
      const z = Math.sin(a) * 0.85
      const camper = buildCamper(JACKETS[Math.floor(rand() * JACKETS.length)], PANTS, SKIN)
      camper.body.rotation.y = Math.atan2(-x, -z) // face au feu
      campProps.add(camper.body)
      campers.push({
        ...camper,
        camp,
        a,
        yaw: camper.body.rotation.y,
        delay: i * CAMP.arrive.step + rand() * 0.2,
        door: doors[i % doors.length], // sa tente quand il pleut
      })
    }
    mergeStatic(campProps, [outer, inner, ...tents.map((t) => t.mesh), ...campers.map((c) => c.body)])
  }

  // Montage d'une tente selon son avancement p (0 = pliée, 1 = montée) : la toile
  // se déplie au sol, puis le mât se dresse avec un léger rebond en la faisant
  // pivoter jusqu'à sa place. Au démontage, le même geste se joue à l'envers.
  const pitchTent = ({ mesh, yaw }, p) => {
    mesh.visible = p > 0
    if (!mesh.visible) return
    const spread = 0.25 + 0.75 * easeOutCubic(clamp01(p / 0.4))
    const rise = easeOutBack(clamp01((p - 0.2) / 0.8))
    mesh.scale.set(spread, Math.max(rise, 0.03), spread)
    mesh.rotation.y = yaw + (1 - easeOutCubic(p)) * 0.9
  }

  // Campeur selon p : il arrive à pied depuis le loin (en fondu), face au feu,
  // puis s'assoit. En repartant (`leaving`), il se lève, fait demi-tour et
  // s'éloigne jusqu'à s'effacer.
  const WALK = 0.8 // part de p consacrée à la marche
  const FAR = 4.2 // distance parcourue depuis sa place (× échelle du camp)
  const placeCamper = ({ body, pose, fade, camp, a, yaw, door }, p, leaving) => {
    body.visible = p > 0 && shelter < 1
    if (!body.visible) return
    const w = clamp01(p / WALK)
    const walk = 1 - (1 - w) ** 2 // ralentit en arrivant
    const r = 0.85 + (1 - walk) * FAR
    const sit = smoothstep(clamp01((p - WALK) / (1 - WALK)))
    pose(r * 9, sit) // le pas suit la distance : pas de patinage
    body.position.x = Math.cos(a) * r
    body.position.z = Math.sin(a) * r
    // hors de la clairière aplanie, le sol monte ou descend : on le suit
    if (r > CAMP_RADIUS) {
      const { scale, position: o } = camp
      const ground = sampleTerrain(o.x + body.position.x * scale.x, o.z + body.position.z * scale.x).h
      body.position.y += (ground - o.y) / scale.x
    }
    // demi-tour en se levant, pour partir de face
    const turn = leaving ? smoothstep(clamp01((WALK + 0.06 - p) / 0.12)) : 0
    body.rotation.y = yaw + Math.PI * turn
    let opacity = smoothstep(clamp01(w / 0.3))

    // Pluie / orage : il se lève, marche jusqu'à sa tente et y entre (fondu) ;
    // quand ça se calme, il en ressort et revient s'asseoir.
    if (shelter > 0) {
      const stand = clamp01(shelter / 0.2)
      const go = smoothstep(clamp01((shelter - 0.2) / 0.65))
      const fromX = body.position.x
      const fromZ = body.position.z
      const dx = door.x - fromX
      const dz = door.z - fromZ
      body.position.x = fromX + dx * go
      body.position.z = fromZ + dz * go
      pose(Math.hypot(dx, dz) * go * 9, sit * (1 - stand))
      // face à la tente en y allant, face au feu en revenant
      if (go > 0) body.rotation.y = Math.atan2(dx, dz) + (shelterTarget ? 0 : Math.PI)
      opacity *= 1 - smoothstep(clamp01((shelter - 0.85) / 0.15))
    }
    fade(opacity)
  }

  // feu selon p : petite flamme qui hésite, puis prend avec un sursaut
  const fireLevel = (p) => (p <= 0 ? 0 : easeOutBack(p))

  const phase = ({ start, length }, delay = 0) => (build - start - delay) / length
  let build = 0 // secondes d'installation écoulées, entre 0 et CAMP_DONE

  const apply = (k, t, leaving) => {
    for (const tent of tents) pitchTent(tent, clamp01(phase(CAMP.pitch, tent.delay)))
    for (const c of campers) placeCamper(c, clamp01(phase(CAMP.arrive, c.delay)), leaving)
    const g = fireLevel(clamp01(phase(CAMP.fire))) * (1 - shelter) // pluie : feu éteint
    for (const f of fires) {
      const tt = t + f.phase
      const flicker = 1 + 0.12 * Math.sin(tt * 9.7) * Math.sin(tt * 3.3) + 0.05 * Math.sin(tt * 23.1)
      const on = g > 0
      f.outer.visible = f.inner.visible = f.halo.visible = on
      f.smoke.object.visible = g > 0.3
      f.light.intensity = 18 * k * g * flicker
      if (!on) continue
      f.outer.scale.set(0.17 * g, 0.5 * g * flicker, 0.17 * g)
      f.inner.scale.set(0.1 * g, 0.32 * g * (2 - flicker), 0.1 * g)
      f.outer.rotation.y = tt * 1.3
      f.inner.rotation.y = -tt * 1.7
      f.halo.material.opacity = g * (0.7 + 0.3 * flicker)
      if (g > 0.3) f.smoke.update(k, tt) // décalée dans le temps : pas synchro avec les autres fumées
    }
  }

  // k = 0 (jour) → 1 (nuit) : passé NIGHT_SWITCH le camp s'installe, avant il se défait
  // (le foyer, lui, reste visible : seuls tentes, campeurs et flammes vont et viennent)
  // abri sous les tentes (pluie, orage) : 0 = dehors autour du feu, 1 = à l'abri
  let shelter = 0
  let shelterTarget = 0
  const SHELTER_TIME = 2.8

  const update = (k, t, dt) => {
    const night = k >= NIGHT_SWITCH
    shelter = approach(shelter, shelterTarget, dt, SHELTER_TIME)
    if (!night && build <= 0) return // camp déjà défait : rien à faire de jour
    build = night ? Math.min(CAMP_DONE, build + dt) : Math.max(0, build - dt * CAMP.teardown)
    apply(k, t, !night)
  }

  // sans animation (scène arrêtée, chargement) : camp installé ou absent d'emblée
  const snap = (isNight) => {
    build = isNight ? CAMP_DONE : 0
    shelter = shelterTarget
    apply(isNight ? 1 : 0, 0, false)
  }
  // `on` : tout le monde à l'abri (feu éteint) ; `now` : sans transition
  const setShelter = (on, now = false) => {
    shelterTarget = on ? 1 : 0
    if (now) shelter = shelterTarget
  }

  const setSnow = (a) => {
    CAP.opacity = a
    for (const { mesh } of tents) mesh.children[0].visible = a > 0
  }
  return { group, update, snap, setShelter, setSnow }
}

// Laisse le navigateur respirer entre deux gros calculs : la construction de la
// scène (≈ 200 ms) ne fige plus la page d'un seul bloc.
// Durée de la bascule jour ↔ nuit (s) : le temps de voir le soleil se coucher et
// la lune se lever. Le ciel CSS (--sky-1/2, style.css) suit la même durée.
const NIGHT_DURATION = 2.4
// Durée d'un changement de météo (s) ; le voile CSS du ciel (style.css) suit.
const WEATHER_DURATION = 3
// Durée d'un changement de saison (s)
const SEASON_DURATION = 4

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Monte la scène dans `canvas` (asynchrone : construite par étapes).
 * `onSlow` est appelé si la machine n'arrive pas à suivre (fallback photo).
 * Jour ou nuit : via `setNight`, appliqué tout de suite tant que la boucle ne tourne pas.
 */
export async function createMountainScene(canvas, { onSlow, onFlash } = {}) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true, // le dégradé CSS du ciel reste visible derrière
    antialias: false,
    powerPreference: 'low-power',
  })
  // résolution 1× : sur écran haute densité c'est le plus gros poste mémoire du canvas
  renderer.setPixelRatio(1)

  const scene = new Scene()
  // le brouillard se fond dans le dégradé CSS du ciel : même couleur (--sky-2)
  scene.fog = new Fog(themeColor('--sky-2', 'light'), 50, 210)

  // champ de vision serré = effet téléobjectif (zoom) sans déplacer la caméra
  const camera = new PerspectiveCamera(36, 1, 1, 400)

  const hemi = new HemisphereLight('#eef4ea', '#3d4a3c', 1.4)
  scene.add(hemi)
  // lumière ambrée venue du soleil — la nuit, lueur froide de la lune au même endroit
  const sun = new DirectionalLight('#ffe0bd', 2.4)
  sun.position.copy(SUN_OFFSET)
  scene.add(sun)
  // Ciel : tout ce qui est « à l'infini » suit la caméra (pas de parallaxe)
  const sky = new Group()
  const sunDisc = buildSun()
  const moonDisc = buildMoon()
  placeOnArc(sunDisc, 0.5)
  placeOnArc(moonDisc, 0)
  const stars = buildStars()
  sky.add(stars, sunDisc, moonDisc)
  scene.add(sky)

  const terrain = buildTerrain()
  terrain.frustumCulled = false // toujours à l'écran (et sa copie JS est libérée)
  freeAfterUpload(terrain)
  scene.add(terrain)
  await yieldToBrowser()
  const forest = buildForest()
  scene.add(forest.group)
  const flowers = buildFlowers()
  scene.add(flowers.mesh)
  await yieldToBrowser()
  const hikers = buildHikers()
  scene.add(hikers.group)
  await yieldToBrowser()
  const lake = buildLake()
  scene.add(lake.mesh)
  const ice = buildIce()
  scene.add(ice.mesh)
  const chalet = buildChalet()
  scene.add(chalet.group)
  const blossom = buildBlossomTree()
  scene.add(blossom.group)
  const fallingLeaves = buildFallingLeaves(SEASON_LOOK.automne.crowns)
  scene.add(fallingLeaves.object)
  const camps = buildCamps()
  scene.add(camps.group)

  // détails vivants (cf. ambient.js)
  const fireflies = buildFireflies((x, z) => Math.max(sampleTerrain(x, z).h, WATER_LEVEL), {
    x: 12,
    z: 12,
    radius: 13, // autour du chalet, de la rive et du camp du lac
  })
  const birds = buildBirds({ center: new Vector3(28, 32, -12), radius: 14 })
  // à droite du texte, au-dessus des crêtes ; mêmes couleurs que les vestes
  const paragliders = buildParagliders(
    [new Vector3(32, 30, -25), new Vector3(48, 42, -60), new Vector3(20, 40, -62)],
    [JACKET_COLORS[0], JACKET_COLORS[2], JACKET_COLORS[1]]
  )
  const shootingStar = buildShootingStar()
  stars.add(shootingStar.object) // dans les étoiles : apparaît et disparaît avec elles
  const clouds = buildClouds()
  sky.add(clouds.object)
  const cloudBank = buildCloudBank() // temps couvert : nuages accrochés aux sommets
  scene.add(cloudBank.object)
  const precipitation = buildPrecipitation()
  const lightning = buildLightning()
  scene.add(precipitation.object, lightning.object)
  scene.add(fireflies.object, birds.object, paragliders.object)

  // Éléments animés et bascule jour/nuit. `when` : 'day' | 'night' = visible
  // seulement à ce moment-là (bascule à NIGHT_SWITCH) ; sans `when`, la visibilité
  // est gérée ailleurs. `update(k, t, dt)` ne tourne que si l'objet est visible.
  const animated = [
    { object: hikers.group, when: 'day', update: (k, t, dt) => hikers.update(dt) },
    // pêcheur : visibilité gérée par chalet.update (nuit, orage)
    { object: birds.object, when: 'day', allow: () => crowdNow.birds, update: (k, t) => birds.update(t) },
    // arrivent en chute libre au jour, repartent en vol plané à la nuit ou s'il pleut
    {
      object: paragliders.object,
      update: (k, t, dt) => paragliders.update(k < NIGHT_SWITCH && crowdNow.paragliders, t, dt),
    },
    { object: fireflies.object, when: 'night', allow: () => crowdNow.fireflies, update: fireflies.update },
    { object: stars, update: shootingStar.update }, // fondu des étoiles : applyNight
    { object: lake.mesh, update: (k, t) => lake.update(t) },
    { object: chalet.group, update: chalet.update },
    { object: camps.group, update: camps.update }, // installe / défait les camps
    { object: clouds.object, update: (k, t) => clouds.update(k, t, wx.shade) },
    { object: cloudBank.object, update: null }, // mis à jour à chaque image (cf. tick)
  ]

  // ---------- jour / nuit ----------
  // `night` va de 0 (jour) à 1 (nuit) ; chaque réglage est interpolé entre les deux.
  const colors = [
    [scene.fog.color, new Color(themeColor('--sky-2', 'dark'))],
    [hemi.color, new Color('#8495bd')],
    [hemi.groundColor, new Color('#151b24')],
    [sun.color, new Color('#b9c9ff')],
    [lake.mesh.material.color, new Color('#22394a')],
    [lake.mesh.material.specular, new Color('#cdd8ff')],
  ].map(([color, nightColor]) => [color, color.clone(), nightColor])
  // ---------- météo ----------
  // État continu qui glisse vers l'aspect de la météo choisie (WEATHER_LOOK) en
  // WEATHER_DURATION s, plus le voile du ciel (même couleur que le CSS du hero).
  // Une bascule part de l'état courant (`from`) vers la cible (`to`) avec une
  // progression `wxP` de 0 à 1 : changer d'avis en cours de route ne fait pas sauter.
  const lookOf = (weather) => {
    const [dayC, dayA] = SKY_VEIL[weather].day
    const [nightC, nightA] = SKY_VEIL[weather].night
    return { ...WEATHER_LOOK[weather], day: new Color(dayC), night: new Color(nightC), dayA, nightA }
  }
  const copyLook = (out, src) => {
    for (const key of Object.keys(WEATHER_LOOK.degage)) out[key] = src[key]
    out.day.copy(src.day)
    out.night.copy(src.night)
    out.dayA = src.dayA
    out.nightA = src.nightA
    return out
  }
  const wx = lookOf('degage') // état courant
  const wxFrom = lookOf('degage')
  let wxTo = lookOf('degage')
  let wxP = 1
  let weatherState = { season: 'ete', weather: 'degage' }
  let crowdNow = crowd('ete', 'degage') // qui est dehors avec cette météo
  const stepWeather = (dt) => {
    wxP = approach(wxP, 1, dt, WEATHER_DURATION)
    const e = smoothstep(wxP) // même allure que la transition CSS (ease-in-out)
    for (const key of Object.keys(WEATHER_LOOK.degage)) wx[key] = wxFrom[key] + (wxTo[key] - wxFrom[key]) * e
    wx.day.copy(wxFrom.day).lerp(wxTo.day, e)
    wx.night.copy(wxFrom.night).lerp(wxTo.night, e)
    wx.dayA = wxFrom.dayA + (wxTo.dayA - wxFrom.dayA) * e
    wx.nightA = wxFrom.nightA + (wxTo.nightA - wxFrom.nightA) * e
  }
  // ---------- saisons ----------
  // Même principe que la météo : instantané `ssFrom` → aspect visé `ssTo`
  // (SEASON_LOOK), progression `ssP` ; les houppiers suivent avec le même `e`.
  const SEASON_KEYS = ['flowers', 'fallen', 'falling', 'pumpkins', 'snow', 'ice', 'crownSize', 'decor']
  const seasonOf = (season) => {
    const L = SEASON_LOOK[season]
    const out = { grass: new Color(L.grass), blossom: new Color(L.blossom) }
    for (const key of SEASON_KEYS) out[key] = L[key]
    return out
  }
  const copySeason = (out, src) => {
    for (const key of SEASON_KEYS) out[key] = src[key]
    out.grass.copy(src.grass)
    out.blossom.copy(src.blossom)
  }
  const ss = seasonOf('ete') // état courant
  const ssFrom = seasonOf('ete')
  let ssTo = seasonOf('ete')
  let ssP = 1
  let seasonNow = 'ete'
  const terrainSeason = terrain.userData.season
  const GRASS_LINEAR = GRASS.clone()
  const applySeason = () => {
    const g = terrainSeason.uGrass.value
    g.setRGB(ss.grass.r / GRASS_LINEAR.r, ss.grass.g / GRASS_LINEAR.g, ss.grass.b / GRASS_LINEAR.b)
    terrainSeason.uFallen.value = ss.fallen
    blossom.setColor(ss.blossom)
    flowers.update(ss.flowers)
    chalet.setSeason(ss)
    terrainSeason.uSnow.value = ss.snow
    forest.setWinter(ss.snow, ss.crownSize)
    camps.setSnow(ss.snow)
    ice.set(ss.ice)
  }
  const stepSeason = (dt) => {
    ssP = approach(ssP, 1, dt, SEASON_DURATION)
    const e = smoothstep(ssP)
    for (const key of SEASON_KEYS) ss[key] = ssFrom[key] + (ssTo[key] - ssFrom[key]) * e
    ss.grass.copy(ssFrom.grass).lerp(ssTo.grass, e)
    ss.blossom.copy(ssFrom.blossom).lerp(ssTo.blossom, e)
    forest.setColors(e)
    applySeason()
  }
  applySeason()

  const fogBase = new Color()
  let hemiBase = 1.4 // intensité hors éclair
  let flash = 0
  const veilNow = new Color()
  const FOG = { near: 50, far: 210 }

  let night = 0
  let nightTarget = 0
  let running = false
  // sens de la bascule en cours : vers la nuit, le soleil se couche à droite et la
  // lune se lève à gauche ; vers le jour, la lune se couche et le soleil se lève.
  // Fixé au départ d'une bascule : un retour en arrière à mi-course rejoue le même
  // trajet à l'envers, sans saut.
  let towardNight = true

  let nightK // `night` lissé, réutilisé par les animations du chalet et des camps

  // jour/nuit × météo : lumières, brouillard (fondu dans le ciel CSS voilé), astres
  const applyLook = () => {
    const k = nightK
    for (const [color, day, dark] of colors) color.copy(day).lerp(dark, k)
    // brouillard = ciel du thème recouvert du même voile que le CSS du hero
    fogBase.copy(scene.fog.color)
    veilNow.copy(wx.day).lerp(wx.night, k)
    const veilA = wx.dayA + (wx.nightA - wx.dayA) * k
    mixSRGB(scene.fog.color, fogBase, veilNow, veilA)
    scene.fog.near = FOG.near * (1 - 0.6 * wx.haze)
    scene.fog.far = FOG.far * (1 - 0.5 * wx.haze)
    hemi.intensity = hemiBase = (1.4 - 0.7 * k) * (1 - wx.dim)
    // ciel couvert : presque plus de lumière directe (soleil ou lune)
    sun.intensity = (2.4 - 1.3 * k) * (1 - 0.75 * wx.cover) * (1 - wx.dim)
    // derrière la couche nuageuse, soleil, lune et étoiles disparaissent
    const clear = 1 - wx.cover
    sunDisc.material.opacity *= clear
    moonDisc.material.opacity *= clear
    stars.material.opacity *= clear
  }

  const applyNight = () => {
    const k = (nightK = smoothstep(night))
    // le soleil part d'abord, la lune arrive ensuite (elles se croisent à mi-course)
    const sunGone = clamp01(k / 0.6)
    const moonUp = clamp01((k - 0.4) / 0.6)
    const sunP = towardNight ? 0.5 + 0.5 * sunGone : 0.5 - 0.5 * sunGone
    const moonP = towardNight ? 0.5 * moonUp : 1 - 0.5 * moonUp
    placeOnArc(sunDisc, sunP)
    placeOnArc(moonDisc, moonP)
    // fondu près de l'horizon, au cas où aucune crête ne le cache
    sunDisc.material.opacity = 1 - sunGone ** 3
    moonDisc.material.opacity = 1 - (1 - moonUp) ** 3
    stars.material.opacity = k
    sunDisc.visible = sunGone < 1
    moonDisc.visible = moonUp > 0
    stars.visible = k > 0
    applyLook()
    // objets de jour ↔ de nuit : la nuit, les randonneurs sont au camp
    const isNight = k >= NIGHT_SWITCH
    for (const { object, when, allow } of animated) {
      if (when) object.visible = (when === 'night') === isNight && (allow?.() ?? true)
    }
    // scène arrêtée : pas d'animation d'installation, le camp est là ou pas
    if (!running) {
      camps.snap(isNight)
      paragliders.snap(!isNight && crowdNow.paragliders)
    }
  }
  applyNight()

  // ---------- taille ----------
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // ---------- interactions ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  const onMove = (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  // ---------- boucle ----------
  let elapsed = 0
  let last = 0
  let frames = 0
  let slowFrames = 0
  let verySlow = 0 // images ≥ 100 ms (dt plafonné à 0.1)
  let checked = false
  // plafond 60 i/s : sur écran 120-165 Hz, la scène lente n'a pas besoin de plus
  const FRAME_MS = 1000 / 60
  let lastFrame = 0

  const tick = (now) => {
    if (lastFrame) {
      const since = now - lastFrame
      if (since < FRAME_MS - 1) return // 1 ms de marge : un écran 60 Hz ne saute pas d'image
      // on garde le retard (borné) pour tenir 60 i/s en moyenne sur 144 Hz
      lastFrame = now - Math.min(Math.max(since - FRAME_MS, 0), FRAME_MS)
    } else lastFrame = now

    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016
    last = now
    elapsed += dt

    // garde-fou perf : sur les ~2 premières secondes, trop d'images lentes → abandon
    if (!checked && elapsed > 0.5) {
      frames++
      if (dt > 1 / 30) slowFrames++
      // machine à genoux : inutile d'attendre les 90 images pour abandonner
      if (dt >= 0.1 && ++verySlow >= 5 && onSlow) {
        checked = true
        onSlow()
        return
      }
      if (frames >= 90) {
        checked = true
        if (slowFrames / frames > 0.4 && onSlow) {
          onSlow()
          return
        }
      }
    }

    mouse.x += (mouse.tx - mouse.x) * 0.04
    mouse.y += (mouse.ty - mouse.y) * 0.04
    const scroll = Math.min(window.scrollY / window.innerHeight, 1)

    // dérive lente + parallax souris + léger survol au scroll
    camera.position.set(
      Math.sin(elapsed * 0.06) * 10 + mouse.x * 8,
      18 - mouse.y * 3 + scroll * 14,
      78 + Math.sin(elapsed * 0.04) * 6 - scroll * 20
    )
    camera.lookAt(mouse.x * 6, 14 - scroll * 4, -60)
    sky.position.copy(camera.position)

    if (night !== nightTarget) {
      const step = dt / NIGHT_DURATION
      night = night < nightTarget ? Math.min(nightTarget, night + step) : Math.max(nightTarget, night - step)
      applyNight()
    }
    if (ssP < 1) stepSeason(dt)
    fallingLeaves.update(dt, ss.falling, nightK)
    if (wxP < 1) {
      stepWeather(dt)
      applyNight() // recalcule lumières, brouillard et astres avec la météo
    }
    cloudBank.update(elapsed, wx.cover, wx.shade, nightK)
    precipitation.update(dt, wx.precip, weatherState.season === 'hiver')
    // éclairs seulement une fois l'orage bien installé
    const f = lightning.update(dt, weatherState.weather === 'orage' && wx.shade > 0.8)
    if (f || flash) {
      flash = f
      hemi.intensity = hemiBase + flash * 1.6
      onFlash?.(flash)
    }

    for (const { object, update } of animated) {
      if (update && object.visible) update(nightK, elapsed, dt)
    }

    renderer.render(scene, camera)
  }

  return {
    start() {
      last = lastFrame = 0
      running = true
      renderer.setAnimationLoop(tick)
    },
    stop() {
      running = false
      renderer.setAnimationLoop(null)
    },
    // transition animée si la scène tourne, sinon immédiate (hero hors écran)
    // météo effective ({ season, weather }) : transition si la scène tourne
    setWeather(next) {
      if (next.season !== seasonNow) {
        seasonNow = next.season
        copySeason(ssFrom, ss)
        ssTo = seasonOf(next.season)
        forest.target(next.season) // repart des couleurs affichées
        ssP = 0
        if (!running) {
          stepSeason(SEASON_DURATION)
          fallingLeaves.snap(ss.falling, nightK)
        }
      }
      weatherState = next
      crowdNow = crowd(next.season, next.weather)
      hikers.setCrowd(crowdNow, !running)
      chalet.setCrowd(crowdNow, !running)
      camps.setShelter(!crowdNow.campFire, !running)
      copyLook(wxFrom, wx)
      wxTo = lookOf(next.weather)
      wxP = 0
      if (!running) {
        precipitation.snap(next.season === 'hiver')
        stepWeather(WEATHER_DURATION)
        applyNight()
        cloudBank.update(elapsed, wx.cover, wx.shade, nightK)
      }
    },
    setNight(on) {
      if (night === 0 || night === 1) towardNight = !!on
      nightTarget = on ? 1 : 0
      if (!running) {
        night = nightTarget
        applyNight()
      }
    },
    dispose() {
      renderer.setAnimationLoop(null)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      disposeTree(scene)
      renderer.dispose()
      renderer.forceContextLoss() // rend aussi le contexte WebGL et le backbuffer du canvas
    },
  }
}
