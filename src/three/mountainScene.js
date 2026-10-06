// Scène 3D du hero : chaîne de montagnes lissée, générée procéduralement.
// Aucun modèle à charger — tout le relief vient d'un bruit seedé.
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  MeshLambertMaterial,
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
  Group,
  Euler,
} from 'three'

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
  const fade = (t) => t * t * (3 - 2 * t)
  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const u = fade(x - xi)
    const v = fade(y - yi)
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

// palette alignée sur le thème "Brume"
const GRASS = new Color('#6f9a68')
const FOREST = new Color('#3f7650')
const ROCK = new Color('#8a958a')
const SNOW = new Color('#f5f7f1')
const SKY = new Color('#e9f0e2') // = --sky-2, le brouillard s'y fond
const FOREST_FLOOR = new Color('#355f42')
const TREE = new Color('#2c5a3a')

const noise = makeNoise(11)

// Relief en un point (x, z) — partagé par le terrain et le placement des arbres.
function sampleTerrain(x, z) {
  // plus on s'éloigne (z négatif), plus le relief monte : premier plan bas
  // pour laisser le texte lisible, sommets au fond.
  const far = clamp01((55 - z) / 140)
  const r = ridged(noise, x * 0.016 + 3.1, z * 0.02 - 1.7)
  const base = r * 50 * (0.12 + Math.pow(far, 1.25)) + noise(x * 0.03, z * 0.03) * 2

  // stries d'érosion : bruit étiré dans le sens de la pente (axe z),
  // + un grain rocheux plus fin. Seulement au-dessus de la zone d'herbe.
  const rockMask = clamp01((base - 8) / 14)
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

    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3))

  const mat = new MeshLambertMaterial({ vertexColors: true })
  return new Mesh(geo, mat)
}

// Données statiques : une fois envoyées à la carte graphique, inutile d'en garder
// une copie côté JavaScript (le relief est recalculé par sampleTerrain au besoin).
function freeAfterUpload(geometry, ...extra) {
  const free = function () {
    this.array = null
  }
  for (const attr of Object.values(geometry.attributes)) attr.onUpload(free)
  geometry.index?.onUpload(free)
  for (const attr of extra) attr?.onUpload(free)
}

// Sapins low-poly en InstancedMesh : des milliers d'arbres en un seul draw call.
function buildForest() {
  const MAX = 14000
  const rand = seeded(4242)

  // sapin = cône posé sur le sol (origine à la base), sans fond (jamais visible)
  const geo = new ConeGeometry(1, 3.4, 6, 1, true)
  geo.translate(0, 1.7, 0)
  const mat = new MeshLambertMaterial({ flatShading: true })
  const trees = new InstancedMesh(geo, mat, MAX)

  const m = new Matrix4()
  const q = new Quaternion()
  const p = new Vector3()
  const s = new Vector3()
  const c = new Color()
  let count = 0

  for (let tries = 0; tries < 300000 && count < MAX; tries++) {
    const x = (rand() - 0.5) * 300
    const z = -90 + rand() * 135 // pas trop près de la caméra
    const { base, h } = sampleTerrain(x, z)
    if (rand() > forestDensity(x, z, base)) continue

    // pas d'arbres sur les pentes trop raides
    if (slope(x, z, h) > 0.9) continue

    const k = 0.16 + rand() * 0.16 // petits par rapport à l'échelle de la montagne
    p.set(x, h - 0.05, z)
    s.set(k, k * (0.85 + rand() * 0.4), k)
    m.compose(p, q, s)
    trees.setMatrixAt(count, m)
    c.copy(TREE).offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.08)
    trees.setColorAt(count, c)
    count++
  }

  trees.count = count
  return trees
}

// Randonneurs : petits personnages (jambes, buste, tête, sac à dos) en
// InstancedMesh, qui se baladent en petits groupes dans les prairies du bas.
function buildHikers() {
  const rand = seeded(777)
  const SPEED = 0.35
  const GAP = 0.8 // écart entre membres d'un groupe (× échelle de la zone)
  const SIDES = [-1, 1]
  const JACKETS = ['#c8553d', '#3d6fc8', '#e0b23c', '#7a4fb0', '#d9663a'].map((c) => new Color(c))
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
    return zone.ok(x, z, base, h)
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

  const group = new Group()
  const part = (geo, count, color) => {
    const mesh = new InstancedMesh(geo, new MeshLambertMaterial({ color }), count)
    mesh.frustumCulled = false // les instances bougent : la sphère englobante serait périmée
    group.add(mesh)
    return mesh
  }
  // origine des personnages aux pieds, regard vers +z ; jambes pivotent à la hanche
  const legs = part(new BoxGeometry(0.045, 0.18, 0.05).translate(0, -0.09, 0), n * 2, '#2f3436')
  const torso = part(new BoxGeometry(0.13, 0.17, 0.08).translate(0, 0.265, 0), n, '#ffffff')
  const head = part(new IcosahedronGeometry(0.05, 0).translate(0, 0.4, 0), n, '#e8c4a0')
  const pack = part(new BoxGeometry(0.12, 0.19, 0.07).translate(0, 0.29, -0.075), n, '#ffffff')
  for (let i = 0; i < n; i++) {
    torso.setColorAt(i, JACKETS[Math.floor(rand() * JACKETS.length)])
    pack.setColorAt(i, PACKS[Math.floor(rand() * PACKS.length)])
  }

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
    for (let i = 0; i < n; i++) {
      const h = hikers[i]
      const k = h.zone.scale
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
      p.set(h.x, sampleTerrain(h.x, h.z).h + bob, h.z)
      s.setScalar(k)
      body.compose(p, q, s)
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

  return { group, update }
}

function disposeMeshes(meshes) {
  for (const mesh of meshes) {
    mesh.geometry.dispose()
    mesh.material.dispose()
    mesh.dispose?.() // InstancedMesh : libère ses attributs d'instance
  }
}

/**
 * Monte la scène dans `canvas`.
 * `onSlow` est appelé si la machine n'arrive pas à suivre (fallback photo).
 */
export function createMountainScene(canvas, { onSlow } = {}) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true, // le dégradé CSS du ciel reste visible derrière
    antialias: false,
    powerPreference: 'low-power',
  })
  // résolution 1× : sur écran haute densité c'est le plus gros poste mémoire du canvas
  renderer.setPixelRatio(1)

  const scene = new Scene()
  scene.fog = new Fog(SKY, 50, 210)

  // champ de vision serré = effet téléobjectif (zoom) sans déplacer la caméra
  const camera = new PerspectiveCamera(36, 1, 1, 400)

  scene.add(new HemisphereLight('#eef4ea', '#3d4a3c', 1.4))
  const sun = new DirectionalLight('#ffe0bd', 2.4) // lumière ambrée, côté soleil
  sun.position.set(80, 70, -40)
  scene.add(sun)

  const terrain = buildTerrain()
  terrain.frustumCulled = false // toujours à l'écran (et sa copie JS est libérée)
  freeAfterUpload(terrain.geometry)
  scene.add(terrain)
  const forest = buildForest()
  forest.frustumCulled = false // arbres partout : inutile de tester la visibilité
  freeAfterUpload(forest.geometry, forest.instanceMatrix, forest.instanceColor)
  scene.add(forest)
  const hikers = buildHikers()
  scene.add(hikers.group)

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
  let checked = false

  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016
    last = now
    elapsed += dt

    // garde-fou perf : sur les ~2 premières secondes, trop d'images lentes → abandon
    if (!checked && elapsed > 0.5) {
      frames++
      if (dt > 1 / 30) slowFrames++
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

    hikers.update(dt)

    renderer.render(scene, camera)
  }

  return {
    start() {
      last = 0
      renderer.setAnimationLoop(tick)
    },
    stop() {
      renderer.setAnimationLoop(null)
    },
    dispose() {
      renderer.setAnimationLoop(null)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      disposeMeshes([terrain, forest, ...hikers.group.children])
      renderer.dispose()
      renderer.forceContextLoss() // rend aussi le contexte WebGL et le backbuffer du canvas
    },
  }
}
