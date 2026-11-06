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
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import { canvasTexture, flatMat, softBlob } from './helpers.js'

// dépasse un peu 1 avant de s'y poser (petit rebond)
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

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
// Au lever du jour, chaque pilote tombe du ciel en chute libre puis ouvre sa voile
// et rejoint son ascendance ; à la nuit, il quitte l'ascendance et part en vol
// plané vers l'arrière des montagnes, en perdant doucement de l'altitude, jusqu'à
// se fondre dans le ciel sombre.
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
  // `state` : 'gone' (absent), 'arriving' (chute puis ouverture), 'flying', 'leaving'
  const gliders = thermals.map((center, i) => ({
    center,
    radius: 6 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.08 + Math.random() * 0.03,
    dir: i % 2 ? -1 : 1,
    delay: i * 0.9 + Math.random() * 0.5, // ils n'arrivent pas tous ensemble
    state: 'flying',
    time: 0, // secondes depuis le début de l'état
    drop: 0, // décalage vertical par rapport à l'ascendance
    open: 1, // voile : 0 = pliée sur le pilote, 1 = déployée
    // départ : position et cap intégrés image par image
    pos: new Vector3(),
    yaw: 0,
    exitYaw: (3 * Math.PI) / 4 + (Math.random() - 0.5) * 0.6, // vers la droite, au fond
    color: new Color(colors[i]),
  }))
  const NIGHT_SKY = new Color('#121b2a') // se fond dans le ciel de nuit (--sky-2)
  const tint = new Color()

  // Arrivée : chute libre (accélère) puis voile qui s'ouvre et freine la chute
  // jusqu'à l'ascendance. Courbe de freinage : drop = BRAKE·(1-s)³, dont la
  // vitesse de départ égale celle de fin de chute libre (pas d'à-coup).
  const FALL = { height: 30, time: 1.2, distance: 12 } // chute libre
  const BRAKE = FALL.height - FALL.distance
  const GRAVITY = (2 * FALL.distance) / FALL.time ** 2
  const BRAKE_TIME = (3 * BRAKE) / (GRAVITY * FALL.time)
  const OPEN_TIME = 0.8 // déploiement de la voile
  const ARRIVE_TIME = FALL.time + BRAKE_TIME
  const arrival = (g, tau) => {
    if (tau < FALL.time) {
      g.drop = FALL.height - 0.5 * GRAVITY * tau * tau
      g.open = 0
    } else {
      const u = Math.min(1, (tau - FALL.time) / BRAKE_TIME)
      g.drop = BRAKE * (1 - u) ** 3
      g.open = easeOutBack(Math.min(1, (tau - FALL.time) / OPEN_TIME))
    }
  }
  // Départ : sortie de l'ascendance en virage doux puis ligne droite, finesse ~7
  const LEAVE = { time: 10, speed: 7, accel: 2.5, glide: 7, turnRate: 0.6 }

  const m = new Matrix4()
  const wm = new Matrix4()
  const p = new Vector3()
  const wp = new Vector3()
  const q = new Quaternion()
  const s = new Vector3(1, 1, 1)
  const ws = new Vector3()
  const e = new Euler()
  const HIDDEN = new Matrix4().makeScale(0, 0, 0)
  const orbitYaw = (g, a) => Math.atan2(-Math.sin(a) * g.dir, Math.cos(a) * g.dir)
  const orbitPos = (g, t, out) => {
    const a = g.phase + t * g.speed * g.dir
    return out.set(
      g.center.x + Math.cos(a) * g.radius,
      g.center.y + Math.sin(t * 0.05 + g.phase) * 4 + g.drop, // monte et redescend lentement
      g.center.z + Math.sin(a) * g.radius
    )
  }
  const PILOT_DROP = SPAN * 0.62 // voile pliée : sur le pilote, au bout des suspentes

  // fait avancer l'état de chaque pilote ; `day` : faut-il qu'ils soient là
  const step = (g, day, t, dt) => {
    g.time += dt
    if (g.state === 'gone' && day) {
      g.state = 'arriving'
      g.time = -g.delay
    } else if ((g.state === 'arriving' || g.state === 'flying') && !day) {
      g.state = 'leaving'
      g.time = 0
      orbitPos(g, t, g.pos)
      g.yaw = orbitYaw(g, g.phase + t * g.speed * g.dir)
      g.vel = g.speed * g.radius // vitesse sur le cercle
    }
    if (g.state === 'arriving') {
      if (g.time >= ARRIVE_TIME) {
        g.state = 'flying'
        g.drop = 0
        g.open = 1
      } else arrival(g, Math.max(0, g.time))
    } else if (g.state === 'leaving') {
      if (g.time >= LEAVE.time) g.state = 'gone'
      // virage progressif vers le cap de sortie, à vitesse de rotation bornée
      let turn = g.exitYaw - g.yaw
      turn = Math.atan2(Math.sin(turn), Math.cos(turn)) // entre -π et π
      g.turn = Math.max(-LEAVE.turnRate, Math.min(LEAVE.turnRate, turn * 1.5))
      g.yaw += g.turn * dt
      g.vel = Math.min(LEAVE.speed, g.vel + LEAVE.accel * dt)
      g.pos.x += Math.sin(g.yaw) * g.vel * dt
      g.pos.z += Math.cos(g.yaw) * g.vel * dt
      g.pos.y -= (g.vel / LEAVE.glide) * dt
      g.open = Math.min(1, g.open + dt / OPEN_TIME) // parti en pleine chute : elle s'ouvre
    }
  }

  let anyone = true // au moins un pilote visible ou en route
  const update = (day, t, dt = 0) => {
    if (!day && !anyone) return
    anyone = false
    gliders.forEach((g, i) => {
      step(g, day, t, dt)
      const waiting = g.state === 'arriving' && g.time < 0
      if (g.state === 'gone' || waiting) {
        wings.setMatrixAt(i, HIDDEN)
        pilots.setMatrixAt(i, HIDDEN)
        if (waiting) anyone = true
        return
      }
      anyone = true
      const leaving = g.state === 'leaving'
      // en vol : cap = tangente au cercle, voile inclinée vers l'intérieur du virage ;
      // au départ : inclinaison selon le virage en cours, à plat en ligne droite
      let yaw, bank
      if (leaving) {
        p.copy(g.pos)
        yaw = g.yaw
        bank = -g.turn * 0.5
      } else {
        orbitPos(g, t, p)
        yaw = orbitYaw(g, g.phase + t * g.speed * g.dir)
        bank = g.dir * 0.3
      }
      // en s'éloignant de nuit, la voile s'assombrit jusqu'à la couleur du ciel
      const fade = leaving ? Math.min(1, Math.max(0, (g.time / LEAVE.time - 0.2) / 0.75)) : 0
      wings.setColorAt(i, tint.copy(g.color).lerp(NIGHT_SKY, fade))
      e.set(0, yaw, bank, 'YXZ')
      q.setFromEuler(e)
      m.compose(p, q, s)
      pilots.setMatrixAt(i, m)
      // voile : sort du sac du pilote et monte au bout des suspentes en s'ouvrant
      const open = Math.max(g.open, 0.04)
      wp.set(0, -PILOT_DROP * (1 - Math.min(1, open)), 0).applyQuaternion(q).add(p)
      ws.set(open, Math.min(1, open), Math.min(1, 0.3 + 0.7 * open))
      wm.compose(wp, q, ws)
      wings.setMatrixAt(i, wm)
    })
    wings.instanceMatrix.needsUpdate = true
    pilots.instanceMatrix.needsUpdate = true
    wings.instanceColor.needsUpdate = true
  }

  // sans animation (scène arrêtée, chargement) : en vol ou absents d'emblée
  const snap = (day) => {
    for (const g of gliders) {
      Object.assign(g, { state: day ? 'flying' : 'gone', time: 0, drop: 0, open: 1 })
    }
    anyone = true
    update(day, 0)
  }
  return { object: group, update, snap }
}

// ---------- nuages ----------
// Sprites lointains qui dérivent lentement ; à placer dans le groupe du ciel, qui
// suit la caméra. La nuit, ils deviennent sombres et voilent un peu les étoiles.
// cumulus : bosses bien dessinées sur une base plate, dessous légèrement grisé
// (sinon un nuage blanc se perd dans le ciel clair et fait un voile).
// Textures partagées par les nuages du ciel et la couche de nuages bas.
let cloudTextures = null
const getCloudTextures = () =>
  (cloudTextures ??= [0, 1, 2].map(() =>
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
  ))

// teinte d'un nuage : blanc → gris pluie → quasi noir d'orage (`shade`), et
// assombri la nuit (`k`)
const CLOUD_WHITE = new Color('#ffffff')
const CLOUD_GREY = new Color('#6b737b')
const CLOUD_BLACK = new Color('#23282d')
const CLOUD_NIGHT = new Color('#2c3548')
const CLOUD_NIGHT_STORM = new Color('#0f1216')
const nightTint = new Color()
function cloudTint(out, shade, k) {
  if (shade < 0.6) out.copy(CLOUD_WHITE).lerp(CLOUD_GREY, shade / 0.6)
  else out.copy(CLOUD_GREY).lerp(CLOUD_BLACK, (shade - 0.6) / 0.4)
  // la nuit, les nuages s'assombrissent, d'autant plus qu'ils sont chargés
  nightTint.copy(CLOUD_NIGHT).lerp(CLOUD_NIGHT_STORM, shade)
  return out.lerp(nightTint, k)
}

export function buildClouds(count = 5) {
  const group = new Group()
  const variants = getCloudTextures()
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

  // `shade` : noirceur des nuages selon la météo (0 = blancs)
  const update = (k, t, shade = 0) => {
    cloudTint(color, shade, k)
    for (const c of clouds) {
      const x = ((c.x0 + t * c.speed) % SPAN) - SPAN / 2
      c.sprite.position.set(x, c.y, -300)
      c.sprite.material.opacity = 0.95 - 0.55 * k * (1 - shade)
      c.sprite.material.color.copy(color)
    }
  }
  return { object: group, update }
}

// ---------- nuages bas (temps couvert) ----------
// Couche de gros nuages accrochés aux sommets, dans le monde (pas dans le ciel qui
// suit la caméra) : les crêtes y entrent et disparaissent. `cover` (0..1) les fait
// apparaître en fondu, `shade` les assombrit (pluie, orage).
export function buildCloudBank(count = 18) {
  const group = new Group()
  const variants = getCloudTextures()
  const color = new Color()
  const SPAN = 200 // boucle de dérive en x, plus large que le champ de vision
  const bank = Array.from({ length: count }, (_, i) => {
    const sprite = new Sprite(
      new SpriteMaterial({ map: variants[i % 3], transparent: true, depthWrite: false, fog: false })
    )
    const w = 38 + Math.random() * 26
    sprite.scale.set(w, w * 0.45, 1)
    group.add(sprite)
    return {
      sprite,
      x0: (i / count) * SPAN + Math.random() * 8,
      y: 26 + Math.random() * 20, // à hauteur des sommets
      z: -45 - Math.random() * 55,
      speed: 0.6 + Math.random() * 0.8,
      alpha: 0.75 + Math.random() * 0.25,
    }
  })

  const update = (t, cover, shade, k) => {
    group.visible = cover > 0
    if (!group.visible) return
    cloudTint(color, shade, k)
    for (const c of bank) {
      const x = ((c.x0 + t * c.speed) % SPAN) - SPAN / 2
      c.sprite.position.set(x, c.y, c.z)
      c.sprite.material.opacity = cover * c.alpha
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

// ---------- pluie et neige qui tombent ----------
// Volume fixe dans le monde, entre la caméra et le fond de la vallée : les gouttes
// proches passent vite et grandes, les lointaines se perdent dans le brouillard.
// `amount` (0..1) règle la densité (on dessine plus ou moins de gouttes, sans
// pop) ; `snow` (booléen) fait glisser de la pluie à la neige en ~2 s.
const PRECIP_BOX = { x: 45, y0: -2, y1: 40, z0: -30, z1: 70 }
export function buildPrecipitation() {
  const group = new Group()
  const box = PRECIP_BOX
  const spawn = (arr, i) => {
    arr[i] = (Math.random() * 2 - 1) * box.x
    arr[i + 1] = box.y0 + Math.random() * (box.y1 - box.y0)
    arr[i + 2] = box.z0 + Math.random() * (box.z1 - box.z0)
  }

  // pluie : traits fins, inclinés par le vent
  const RAIN = 1600
  const DROP = 0.8 // longueur d'une goutte
  const FALL = 26 // vitesse de chute
  const WIND = 0.18 // inclinaison (déplacement en x par unité de chute)
  const drops = new Float32Array(RAIN * 3)
  for (let i = 0; i < RAIN; i++) spawn(drops, i * 3)
  const rainPos = new Float32Array(RAIN * 6)
  const rainGeo = new BufferGeometry()
  rainGeo.setAttribute('position', new BufferAttribute(rainPos, 3))
  const rain = new LineSegments(
    rainGeo,
    new LineBasicMaterial({ color: '#c3ccd6', transparent: true, opacity: 0.5, depthWrite: false })
  )
  rain.frustumCulled = false

  // neige : flocons qui tombent doucement en ondulant
  const SNOW = 2600
  const flakes = new Float32Array(SNOW * 3)
  const sway = new Float32Array(SNOW)
  for (let i = 0; i < SNOW; i++) {
    spawn(flakes, i * 3)
    sway[i] = Math.random() * Math.PI * 2
  }
  const snowPos = new Float32Array(SNOW * 3)
  const snowGeo = new BufferGeometry()
  snowGeo.setAttribute('position', new BufferAttribute(snowPos, 3))
  const snow = new Points(
    snowGeo,
    new PointsMaterial({
      color: '#ffffff',
      size: 0.32, // ~3 px à mi-distance, plus gros tout près de la caméra
      map: canvasTexture(32, 32, (ctx) => softBlob(ctx, 16, 16, 15, 1, 0.45)), // flocon rond
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  )
  snow.frustumCulled = false
  group.add(rain, snow)

  let snowMix = 0
  let t = 0
  const wrap = (arr, i) => {
    if (arr[i + 1] < box.y0) {
      arr[i + 1] += box.y1 - box.y0
      arr[i] = (Math.random() * 2 - 1) * box.x
    }
  }

  const update = (dt, amount, isSnow) => {
    t += dt
    snowMix = Math.min(1, Math.max(0, snowMix + (isSnow ? dt : -dt) / 2))
    const nRain = Math.floor(RAIN * amount * (1 - snowMix))
    const nSnow = Math.floor(SNOW * amount * snowMix)
    rain.visible = nRain > 0
    snow.visible = nSnow > 0

    if (rain.visible) {
      for (let i = 0; i < nRain; i++) {
        const j = i * 3
        drops[j + 1] -= FALL * dt
        drops[j] -= FALL * WIND * dt
        wrap(drops, j)
        const k = i * 6
        rainPos[k] = drops[j]
        rainPos[k + 1] = drops[j + 1]
        rainPos[k + 2] = drops[j + 2]
        rainPos[k + 3] = drops[j] + DROP * WIND
        rainPos[k + 4] = drops[j + 1] + DROP
        rainPos[k + 5] = drops[j + 2]
      }
      rainGeo.setDrawRange(0, nRain * 2)
      rainGeo.attributes.position.needsUpdate = true
    }
    if (snow.visible) {
      for (let i = 0; i < nSnow; i++) {
        const j = i * 3
        flakes[j + 1] -= 1.4 * dt
        wrap(flakes, j)
        snowPos[j] = flakes[j] + Math.sin(t * 0.8 + sway[i]) * 0.6
        snowPos[j + 1] = flakes[j + 1]
        snowPos[j + 2] = flakes[j + 2] + Math.cos(t * 0.6 + sway[i]) * 0.4
      }
      snowGeo.setDrawRange(0, nSnow)
      snowGeo.attributes.position.needsUpdate = true
    }
  }
  // sans transition (scène arrêtée, chargement) : directement pluie ou neige
  const snap = (isSnow) => {
    snowMix = isSnow ? 1 : 0
  }
  return { object: group, update, snap }
}

// ---------- éclairs (orage) ----------
// Toutes les 4 à 11 s : un éclair en zigzag tombe au loin, avec un double flash.
// `update` renvoie l'intensité du flash (0..1), que la scène ajoute à sa lumière
// et que le hero applique au ciel CSS.
export function buildLightning() {
  const WIDTH = 0.9
  const POINTS = 14
  const pos = new Float32Array(POINTS * 2 * 3)
  const index = []
  for (let i = 0; i < POINTS - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setIndex(index)
  const bolt = new Mesh(
    geo,
    new MeshBasicMaterial({ color: '#eef3ff', fog: false, transparent: true, depthWrite: false, side: DoubleSide })
  )
  bolt.frustumCulled = false
  bolt.visible = false

  // ruban en zigzag du haut du ciel jusque derrière les crêtes
  const reshape = () => {
    let x = (Math.random() * 2 - 1) * 90
    const z = -140 - Math.random() * 60
    for (let i = 0; i < POINTS; i++) {
      const y = 100 - (i / (POINTS - 1)) * 75
      if (i) x += (Math.random() - 0.5) * 9
      const w = WIDTH * (1 - (i / POINTS) * 0.6)
      pos.set([x - w, y, z, x + w, y, z], i * 6)
    }
    geo.attributes.position.needsUpdate = true
  }

  // double flash : [début, fin, intensité] en secondes depuis l'impact
  const PULSES = [
    [0, 0.12, 1],
    [0.2, 0.3, 0.65],
  ]
  let next = 3 + Math.random() * 4
  let since = Infinity

  const update = (dt, active) => {
    since += dt
    if (active) {
      next -= dt
      if (next <= 0) {
        next = 4 + Math.random() * 7
        since = 0
        reshape()
      }
    }
    let flash = 0
    for (const [a, b, f] of PULSES) {
      if (since >= a && since < b) flash = f * (1 - (since - a) / (b - a) * 0.5)
    }
    bolt.visible = flash > 0.3
    bolt.material.opacity = flash
    return flash
  }
  return { object: bolt, update }
}

// Feuilles d'automne portées par le vent, qui tombent en se balançant et en
// tournoyant dans un volume juste devant la caméra (comme la pluie) : à leur
// taille réelle (une main de randonneur), plus loin elles feraient moins d'un pixel.
// `colors` : teintes des feuilles. `amount` (0..1) règle combien repartent d'en
// haut : à 0, celles en l'air finissent leur traversée et aucune ne repart.
const LEAF_BOX = { x: 12, y0: 11, y1: 24, z0: 50, z1: 67 }
export function buildFallingLeaves(colors) {
  const COUNT = 160
  const FALL = 0.6 // vitesse de chute (u/s)
  const FADE = 1.2 // hauteur (u) sur laquelle elles rapetissent en bas du volume
  const box = LEAF_BOX
  const geo = new PlaneGeometry(0.05, 0.035) // une main de randonneur
  // sans éclairage : vues à contre-jour (soleil en face), elles paraîtraient noires
  const mat = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new InstancedMesh(geo, mat, COUNT)
  mesh.frustumCulled = false
  const c = new Color()
  for (let i = 0; i < COUNT; i++) mesh.setColorAt(i, c.set(colors[i % colors.length]))

  // état par feuille : en l'air ou endormie (en attente de repartir d'en haut)
  const leaves = Array.from({ length: COUNT }, () => ({
    flying: false, x: 0, y: 0, z: 0, phase: 0, spin: 0,
  }))
  const launch = (l, y = box.y1) => {
    l.x = (Math.random() * 2 - 1) * box.x - 3 // le vent les pousse vers +x
    l.y = y
    l.z = box.z0 + Math.random() * (box.z1 - box.z0)
    l.phase = Math.random() * Math.PI * 2
    l.spin = 2 + Math.random() * 3
    l.flying = true
  }

  const m = new Matrix4()
  const q = new Quaternion()
  const e = new Euler()
  const p = new Vector3()
  const sc = new Vector3()
  let t = 0
  // k : 0 (jour) → 1 (nuit), les feuilles s'assombrissent
  const update = (dt, amount, k = 0) => {
    t += dt
    mat.color.setScalar(1 - 0.8 * k)
    let active = 0
    for (let i = 0; i < COUNT; i++) {
      const l = leaves[i]
      // une feuille endormie repart d'en haut, au compte-gouttes
      if (!l.flying && Math.random() < amount * dt) launch(l)
      let size = 0
      if (l.flying) {
        // balancement de côté et vent léger, en tournoyant
        l.y -= FALL * dt * (0.6 + 0.4 * Math.sin(t * 2.6 + l.phase))
        l.x += (0.5 + 0.4 * Math.sin(t * 1.5 + l.phase)) * dt
        l.z += 0.2 * Math.cos(t * 1.1 + l.phase) * dt
        size = Math.min(1, (l.y - box.y0) / FADE)
        if (size <= 0) {
          // arrivée en bas : repart d'en haut, ou s'endort si l'automne s'en va
          if (Math.random() < amount) launch(l)
          else l.flying = false
          size = 0
        }
      }
      if (size > 0) active++
      e.set(t * l.spin + l.phase, l.phase, Math.sin(t * l.spin * 0.7) * 1.2)
      p.set(l.x, l.y, l.z)
      m.compose(p, q.setFromEuler(e), sc.set(size, size, size))
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.visible = active > 0
  }
  // sans transition : des feuilles déjà réparties sur toute la hauteur, ou aucune
  const snap = (amount, k = 0) => {
    for (const l of leaves) {
      if (Math.random() < amount) launch(l, box.y0 + Math.random() * (box.y1 - box.y0))
      else l.flying = false
    }
    update(0, amount, k)
  }
  snap(0)
  return { object: mesh, update, snap }
}
