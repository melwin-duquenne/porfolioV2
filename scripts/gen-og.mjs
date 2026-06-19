// Génère public/og-image.png (1200x630) à partir d'un SVG de marque.
// Regénérable : `npm run gen:og`. Nécessite la devDependency @resvg/resvg-js.
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const W = 1200
const H = 630

// Palette reprise de src/style.css (thème clair).
const BG = '#eef1e8'
const PANEL = '#f6f8f1'
const INK = '#18211a'
const MUTED = '#5a6a5c'
const LINE = '#d4ddca'
const GREEN = '#2f9d5b'
const AMBER = '#e08a3c'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="28" fill="${PANEL}" stroke="${LINE}" stroke-width="2"/>

  <g font-family="Archivo, 'Segoe UI', Arial, sans-serif">
    <text x="96" y="150" font-size="26" letter-spacing="6" font-weight="700" fill="${MUTED}">PORTFOLIO</text>

    <text x="92" y="300" font-size="118" font-weight="900" fill="${INK}">Melwin</text>
    <text x="92" y="418" font-size="118" font-weight="900" fill="${INK}">Duquenne<tspan fill="${GREEN}">.</tspan></text>

    <rect x="96" y="468" width="64" height="6" rx="3" fill="${AMBER}"/>
    <text x="180" y="486" font-size="38" font-weight="600" fill="${MUTED}">Développeur Full Stack</text>

    <text x="96" y="560" font-family="'Space Mono', 'Courier New', monospace" font-size="24" fill="${MUTED}">Vue · Symfony · TypeScript · Docker — Nougaroulet (32)</text>
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
