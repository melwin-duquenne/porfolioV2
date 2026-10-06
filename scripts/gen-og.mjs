// Génère public/og-image.png (1200x630) : la montagne 3D du hero en fond, le nom
// par-dessus. Regénérable : `npm run gen:og`. Nécessite la devDependency @resvg/resvg-js.
// Le fond, scripts/og-scene.jpg, est une capture du hero en mode jour, sans texte ni
// menu (à refaire si la scène change).
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const W = 1200
const H = 630

// Palette du thème clair, lue dans src/style.css (seule source des couleurs)
const css = fs.readFileSync(path.join(process.cwd(), 'src', 'style.css'), 'utf8')
const lightTheme = css.match(/\[data-theme="light"\]\s*\{([^}]*)\}/)?.[1]
if (!lightTheme) throw new Error('style.css : bloc du thème clair introuvable')
const token = (name) => {
  const value = lightTheme.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))?.[1]
  if (!value) throw new Error(`style.css : couleur --${name} introuvable`)
  return value
}
const BG = token('bg')
const INK = token('ink')
const MUTED = token('muted')
const GREEN = token('green')
const AMBER = token('amber')

// Dimensions d'un JPEG, lues dans son en-tête (segment SOFn)
function jpegSize(buf) {
  for (let i = 2; i < buf.length; ) {
    const marker = buf[i + 1]
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  throw new Error('og-scene.jpg : dimensions introuvables')
}

// Capture d'écran du navigateur (barre de défilement comprise, à droite) : mise à
// l'échelle pour couvrir la largeur hors barre, décalée à droite pour dégager le
// texte ; le chalet et le lac restent nets, la barre sort du cadre.
const SCROLLBAR = 15 // px, dans la capture
const sceneJpg = fs.readFileSync(path.join(process.cwd(), 'scripts', 'og-scene.jpg'))
const SCENE = sceneJpg.toString('base64')
const shot = jpegSize(sceneJpg)
const SCALE = W / (shot.w - SCROLLBAR)
const IMG = { x: 120, y: -70, w: Math.round(shot.w * SCALE), h: Math.round(shot.h * SCALE) }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- voile clair à gauche : le nom reste lisible, la scène apparaît à droite -->
    <linearGradient id="veil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BG}" stop-opacity="0.97"/>
      <stop offset="0.45" stop-color="${BG}" stop-opacity="0.88"/>
      <stop offset="0.62" stop-color="${BG}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <image x="${IMG.x}" y="${IMG.y}" width="${IMG.w}" height="${IMG.h}" preserveAspectRatio="none"
    xlink:href="data:image/jpeg;base64,${SCENE}"/>
  <rect width="${W}" height="${H}" fill="url(#veil)"/>

  <g font-family="Archivo, 'Segoe UI', Arial, sans-serif">
    <text x="72" y="130" font-size="26" letter-spacing="6" font-weight="700" fill="${MUTED}">PORTFOLIO</text>

    <text x="68" y="280" font-size="118" font-weight="900" fill="${INK}">Melwin</text>
    <text x="68" y="398" font-size="118" font-weight="900" fill="${INK}">Duquenne<tspan fill="${GREEN}">.</tspan></text>

    <rect x="72" y="448" width="64" height="6" rx="3" fill="${AMBER}"/>
    <text x="156" y="466" font-size="38" font-weight="600" fill="${MUTED}">Développeur Full Stack</text>

    <text x="72" y="540" font-family="'Space Mono', 'Courier New', monospace" font-size="24" fill="${MUTED}">Vue · Symfony · TypeScript · Docker — Nougaroulet (32)</text>
  </g>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { loadSystemFonts: true },
})
const png = resvg.render().asPng()

const out = path.join(process.cwd(), 'public', 'og-image.png')
fs.writeFileSync(out, png)
console.log(`✓ ${out} (${(png.length / 1024).toFixed(1)} Ko)`) // eslint-disable-line no-console
