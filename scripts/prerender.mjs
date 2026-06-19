// Injecte le HTML rendu côté serveur dans dist/index.html après le build.
// Lancé par `npm run build` une fois le build client et le build SSR terminés.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const serverEntry = path.join(root, '.ssr-dist/entry-server.js')
const indexPath = path.join(root, 'dist/index.html')

const { render } = await import(pathToFileURL(serverEntry).href)
const appHtml = await render()

let html = fs.readFileSync(indexPath, 'utf-8')
if (!html.includes('<div id="app"></div>')) {
  throw new Error('Marqueur <div id="app"></div> introuvable dans dist/index.html')
}
html = html.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`)
fs.writeFileSync(indexPath, html)

console.log(`✓ Prérendu injecté dans dist/index.html (${appHtml.length} caractères)`) // eslint-disable-line no-console
