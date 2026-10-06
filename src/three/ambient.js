// Détails vivants de la montagne : fumées, lucioles, étoiles filantes,
// oiseaux, parapentes, nuages, poisson qui saute. Chaque builder renvoie { object, update }.
// `k` va de 0 (jour) à 1 (nuit) ; `t` est le temps écoulé en secondes.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import { canvasTexture, flatMat, softBlob } from './helpers.js'

// Événement qui revient à intervalle aléatoire (étoile filante, poisson…).
// `fired(t)` est vrai à l'instant du déclenchement ; `since(t)` donne les secondes
// écoulées depuis le dernier (Infinity avant le premier).
function randomEvent(firstIn, minGap, maxGap) {
  let start = -Infinity
  let next = firstIn
  return {
    fired(t) {
      if (t < next) return false
      start = t
      next = t + minGap + Math.random() * (maxGap - minGap)
      return true
    },
    since: (t) => t - start,
  }
}

// ---------- fumée (cheminée du chalet, feux de camp) ----------
// Bouffées qui montent, gonflent et s'effacent en dérivant avec le vent.
// `nightColor` : teinte la nuit (plus claire au-dessus d'un feu, qui l'éclaire)
let smokeMap // une seule texture pour toutes les fumées
export function buildSmoke({ nightColor = '#4a5160' } = {}) {
  smokeMap ??= canvasTexture(64, 64, (ctx, w) => softBlob(ctx, w / 2, w / 2, w / 2, 0.9))
  const group = new Group()
  const DAY = new Color('#eef1ec')
  const NIGHT = new Color(nightColor)
  const color = new Color()
  const LIFE = 7 // secondes de vie d'une bouffée
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const sprite = new Sprite(new SpriteMaterial({ map: smokeMap, depthWrite: false }))
    group.add(sprite)
    return { sprite, offset: i / 7 }
  })

  const update = (k, t) => {
    color.copy(DAY).lerp(NIGHT, k)
    for (const { sprite, offset } of puffs) {
      const age = (t / LIFE + offset) % 1
      const sway = Math.sin(t * 0.7 + offset * 6)
      sprite.position.set(age * 1.1 + sway * 0.1, age * 2.6, sway * 0.05)
      sprite.scale.setScalar(0.35 + age * 1.2)
      sprite.material.opacity = Math.min(age / 0.12, 1) * (1 - age) * (0.85 - 0.3 * k)
      sprite.material.color.copy(color)
    }
  }
  return { object: group, update }
}

// ---------- lucioles (nuit) ----------
// Points qui flottent près du sol et clignotent doucement, chacun à son rythme.
export function buildFireflies(groundAt, { x, z, radius, count = 45 }) {
  const home = []
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * radius
    const hx = x + Math.cos(a) * r
    const hz = z + Math.sin(a) * r
    home.push({
      x: hx,
      y: groundAt(hx, hz) + 0.3 + Math.random() * 1.1,
      z: hz,
      phase: Math.random() * 20,
      speed: 0.4 + Math.random() * 0.5,
      blink: 0.6 + Math.random() * 0.9,
    })
  }
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('color', new BufferAttribute(col, 3))
  const points = new Points(
    geo,
    new PointsMaterial({
      // point rond et lumineux plutôt qu'un pixel carré
      map: canvasTexture(32, 32, (ctx, w) => softBlob(ctx, w / 2, w / 2, w / 2, 1, 0.2)),
      size: 7,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  )
  points.frustumCulled = false // les points bougent

  const update = (k, t) => {
    for (let i = 0; i < count; i++) {
      const f = home[i]
      const tt = t * f.speed + f.phase
      pos[i * 3] = f.x + Math.sin(tt) * 0.5
      pos[i * 3 + 1] = f.y + Math.sin(tt * 1.7) * 0.2
      pos[i * 3 + 2] = f.z + Math.cos(tt * 0.8) * 0.5
      // vert-jaune
      const glow = k * Math.pow(Math.max(0, Math.sin(t * f.blink + f.phase)), 4)
      col[i * 3] = glow * 0.85
      col[i * 3 + 1] = glow
      col[i * 3 + 2] = glow * 0.45
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate = true
  }
  return { object: points, update }
}

// ---------- étoile filante (nuit) ----------
// Traînée lumineuse qui traverse le ciel de temps en temps. À placer dans le
// groupe du ciel, qui suit la caméra (coordonnées relatives à la caméra).
export function buildShootingStar() {
  const map = canvasTexture(128, 8, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0)
    g.addColorStop(0, 'rgba(255, 255, 255, 0)')
    g.addColorStop(0.85, 'rgba(225, 235, 255, 0.7)')
    g.addColorStop(1, 'rgba(255, 255, 255, 1)') // tête à droite
    ctx.fillStyle = g
    ctx.fillRect(0, h / 4, w, h / 2)
  })
  const sprite = new Sprite(
    new SpriteMaterial({ map, fog: false, depthWrite: false, blending: AdditiveBlending })
  )
  sprite.scale.set(30, 1, 1)
  sprite.visible = false

  const DURATION = 0.8
  const from = new Vector3()
  const velocity = new Vector3()
  const event = randomEvent(3 + Math.random() * 5, 7, 17)

  // appelée seulement quand les étoiles sont visibles (k > 0)
  const update = (k, t) => {
    if (event.fired(t)) {
      const side = Math.random() < 0.5 ? -1 : 1
      from.set((Math.random() - 0.5) * 260, 60 + Math.random() * 30, -300)
      velocity.set(side * (130 + Math.random() * 50), -60 - Math.random() * 30, 0)
      sprite.material.rotation = Math.atan2(velocity.y, velocity.x)
    }
    const age = event.since(t) / DURATION
    sprite.visible = age <= 1
    if (!sprite.visible) return
    sprite.position.copy(from).addScaledVector(velocity, age * DURATION)
    sprite.material.opacity = k * Math.sin(age * Math.PI)
  }
  return { object: sprite, update }
}

// ---------- oiseaux (jour) ----------
// Petite volée qui tourne au-dessus de la vallée, en battant des ailes ou en planant.
const SIDES = [-1, 1]
export function buildBirds({ center, radius, count = 5 }) {
  // une aile : triangle, attache le long de z, pointe vers +x (miroir pour l'autre)
  const wing = new BufferGeometry()
  wing.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0.14, 0, 0, -0.14, 0.7, 0, -0.06]), 3)
  )
  const mesh = new InstancedMesh(
    wing,
    new MeshBasicMaterial({ color: '#2f3530', side: DoubleSide }),
    count * 2
  )
  mesh.frustumCulled = false // les instances bougent

  const birds = Array.from({ length: count }, () => ({
    phase: Math.random() * Math.PI * 2,
    radius: radius * (0.7 + Math.random() * 0.5),
    height: (Math.random() - 0.5) * 4,
    speed: 0.12 + Math.random() * 0.05,
    flap: Math.random() * 10,
  }))
  const m = new Matrix4()
  const p = new Vector3()
  const q = new Quaternion()
  const s = new Vector3()
  const e = new Euler()

  const update = (t) => {
    for (let i = 0; i < count; i++) {
      const b = birds[i]
      const a = b.phase + t * b.speed
      p.set(
        center.x + Math.cos(a) * b.radius,
        center.y + b.height + Math.sin(t * 0.5 + b.phase) * 0.8,
        center.z + Math.sin(a) * b.radius
      )
      // battements, avec des phases de vol plané
      const gliding = Math.sin(t * 0.6 + b.phase) < -0.3
      const flap = gliding ? 0.15 : Math.sin(t * 9 + b.flap) * 0.6
      for (const side of SIDES) {
        e.set(0, -a, side * flap, 'YXZ') // cap = -a : tangente au cercle
        q.setFromEuler(e)
        s.set(side, 1, 1)
        mesh.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), m.compose(p, q, s))
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  return { object: mesh, update }
}

// ---------- parapentes (jour) ----------
// Voiles qui spiralent dans les ascendances au-dessus des sommets, pilote suspendu
// dessous. `thermals` : un centre { x, y, z } par voile ; `colors` : leurs couleurs.
export function buildParagliders(thermals, colors) {
  const SPAN = 3 // envergure
  const ARC = 0.9 // demi-angle de l'arc : les extrémités de la voile retombent
  const R = SPAN / 2 / Math.sin(ARC)
  const CHORD = SPAN * 0.32
  const CELLS = 12

  // voile : bande courbée en arc (envergure sur x, bord d'attaque vers +z),
  // plus étroite aux extrémités ; caissons alternativement clairs et foncés
  const edge = (j) => {
    const th = -ARC + (2 * ARC * j) / CELLS
    const half = (CHORD / 2) * (1 - 0.45 * (th / ARC) ** 2)
    const x = R * Math.sin(th)
    const y = R * (Math.cos(th) - 1)
    return [
      [x, y, half],
      [x, y, -half],
    ]
  }
  const pos = []
  const col = []
  for (let i = 0; i < CELLS; i++) {
    const [[a, b], [c, d]] = [edge(i), edge(i + 1)]
    pos.push(...a, ...b, ...c, ...c, ...b, ...d)
    const shade = i % 2 ? 0.8 : 1
    for (let k = 0; k < 6; k++) col.push(shade, shade, shade)
  }
  const wingGeo = new BufferGeometry()
  wingGeo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  wingGeo.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
  wingGeo.computeVertexNormals()

  const n = thermals.length
  const wings = new InstancedMesh(
    wingGeo,
    // non éclairée et sans brouillard : vue d'en dessous et de loin, une voile
    // éclairée tournait au gris ; elle doit rester une tache de couleur vive
    new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, fog: false }),
    n
  )
  colors.forEach((c, i) => wings.setColorAt(i, new Color(c)))
  // pilote dans sa sellette, au bout des suspentes (trop fines pour être dessinées)
  const pilots = new InstancedMesh(
    new ConeGeometry(SPAN * 0.05, SPAN * 0.13, 5).translate(0, -SPAN * 0.62, 0),
    flatMat('#2f3436'),
    n
  )
  const group = new Group()
  for (const mesh of [wings, pilots]) {
    mesh.frustumCulled = false // les instances bougent
    group.add(mesh)
  }

  // chacun tourne autour de son ascendance, à son rythme et dans son sens
  const gliders = thermals.map((center, i) => ({
    center,
    radius: 6 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.08 + Math.random() * 0.03,
    dir: i % 2 ? -1 : 1,
  }))
  const m = new Matrix4()
  const p = new Vector3()
  const q = new Quaternion()
  const s = new Vector3(1, 1, 1)
  const e = new Euler()

  const update = (t) => {
    gliders.forEach((g, i) => {
      const a = g.phase + t * g.speed * g.dir
      p.set(
        g.center.x + Math.cos(a) * g.radius,
        g.center.y + Math.sin(t * 0.05 + g.phase) * 4, // monte et redescend lentement
        g.center.z + Math.sin(a) * g.radius
      )
      // cap = tangente au cercle ; voile inclinée vers l'intérieur du virage
      e.set(0, Math.atan2(-Math.sin(a) * g.dir, Math.cos(a) * g.dir), g.dir * 0.3, 'YXZ')
      q.setFromEuler(e)
      m.compose(p, q, s)
      wings.setMatrixAt(i, m)
      pilots.setMatrixAt(i, m)
    })
    wings.instanceMatrix.needsUpdate = true
    pilots.instanceMatrix.needsUpdate = true
  }
  return { object: group, update }
}

// ---------- nuages ----------
// Sprites lointains qui dérivent lentement ; à placer dans le groupe du ciel, qui
// suit la caméra. La nuit, ils deviennent sombres et voilent un peu les étoiles.
export function buildClouds(count = 5) {
  const group = new Group()
  // cumulus : bosses bien dessinées sur une base plate, dessous légèrement grisé
  // (sinon un nuage blanc se perd dans le ciel clair et fait un voile)
  const variants = [0, 1].map(() =>
    canvasTexture(256, 128, (ctx, w, h) => {
      // tout reste dans le canvas (y + r ≤ 128), sinon le bord du nuage est coupé net
      for (const x of [92, 128, 164]) softBlob(ctx, x, 86, 38, 0.95, 0.55) // base
      for (let i = 0; i < 6; i++) {
        const x = 70 + Math.random() * 116
        softBlob(ctx, x, 62 + Math.random() * 18, 22 + Math.random() * 22, 0.95, 0.6)
      }
      ctx.globalCompositeOperation = 'source-atop' // ne teinte que le nuage
      const shade = ctx.createLinearGradient(0, 40, 0, h)
      shade.addColorStop(0, 'rgba(255, 255, 255, 0)')
      shade.addColorStop(1, 'rgba(150, 168, 178, 0.55)')
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, w, h)
    })
  )
  const DAY = new Color('#ffffff')
  const NIGHT = new Color('#2c3548')
  const color = new Color()
  const SPAN = 460 // largeur de la boucle de dérive, au-delà du champ de vision
  const clouds = Array.from({ length: count }, (_, i) => {
    const sprite = new Sprite(
      new SpriteMaterial({ map: variants[i % 2], fog: false, depthWrite: false })
    )
    const w = 45 + Math.random() * 35
    sprite.scale.set(w, w * 0.5, 1)
    group.add(sprite)
    return {
      sprite,
      x0: (i / count) * SPAN,
      y: 30 + Math.random() * 22, // juste au-dessus des sommets, parfois derrière
      speed: 1.5 + Math.random() * 1.5,
    }
  })

  const update = (k, t) => {
    color.copy(DAY).lerp(NIGHT, k)
    for (const c of clouds) {
      const x = ((c.x0 + t * c.speed) % SPAN) - SPAN / 2
      c.sprite.position.set(x, c.y, -300)
      c.sprite.material.opacity = 0.95 - 0.55 * k
      c.sprite.material.color.copy(color)
    }
  }
  return { object: group, update }
}

// ---------- poisson qui saute près du bouchon (jour) ----------
// Repère du pêcheur : `water` = hauteur de l'eau, `z` = distance du bouchon.
export function buildFishJump({ water, z }) {
  const group = new Group()
  const fishGeo = new ConeGeometry(0.06, 0.3, 5).rotateZ(-Math.PI / 2) // pointe vers +x
  const fish = new Mesh(fishGeo, flatMat('#5f7378')) // sombre : se détache sur le reflet
  group.add(fish)
  // ronds dans l'eau : au départ du saut, puis à l'arrivée
  const ringGeo = new RingGeometry(0.08, 0.1, 20).rotateX(-Math.PI / 2)
  const ripples = [0, 1].map(() => {
    const ring = new Mesh(
      ringGeo,
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })
    )
    group.add(ring)
    return ring
  })

  const JUMP = 0.8
  const RIPPLE = 1.2 // durée d'un rond dans l'eau
  const HALF = 0.35 // demi-longueur du saut
  const HEIGHT = 0.45
  const event = randomEvent(4 + Math.random() * 6, 6, 14)
  let dx = 0 // décalage du saut par rapport au bouchon

  const update = (t) => {
    if (event.fired(t)) {
      dx = (Math.random() - 0.5) * 0.6
      ripples[0].position.set(dx - HALF, water + 0.005, z + 0.15)
      ripples[1].position.set(dx + HALF, water + 0.005, z + 0.15)
    }
    const since = event.since(t)
    const age = since / JUMP
    fish.visible = age <= 1
    if (fish.visible) {
      // arc de parabole ; le poisson suit la tangente
      fish.position.set(dx - HALF + age * HALF * 2, water + 4 * HEIGHT * age * (1 - age), z + 0.15)
      fish.rotation.z = Math.atan2(HEIGHT * 4 * (1 - 2 * age), HALF * 2)
    }
    ripples.forEach((ring, i) => {
      const a = (since - i * JUMP) / RIPPLE // le second part quand le poisson retombe
      ring.visible = a >= 0 && a <= 1
      if (!ring.visible) return
      ring.scale.setScalar(1 + a * 3)
      ring.material.opacity = 0.6 * (1 - a)
    })
  }
  return { object: group, update }
}
