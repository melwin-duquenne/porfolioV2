// Petits outils partagés par mountainScene.js et ambient.js (module à part : un
// import direct entre ces deux fichiers serait circulaire).
import { CanvasTexture, Matrix4, MeshLambertMaterial, SRGBColorSpace } from 'three'

// Texture peinte sur un canvas 2D : paint(ctx, width, height)
export function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d'), width, height)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  return map
}

// Tache ronde et floue (fumée, nuages, lucioles) ; `core` = part du rayon pleinement opaque
export function softBlob(ctx, x, y, r, alpha, core = 0) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
  g.addColorStop(core, `rgba(255, 255, 255, ${alpha})`)
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// Matériau mat à facettes, le style low-poly de tous les petits objets
export const flatMat = (color, emissive = '#000000') =>
  new MeshLambertMaterial({ color, emissive, flatShading: true })

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const smoothstep = (t) => t * t * (3 - 2 * t) // t dans [0, 1]
export const easeOutCubic = (t) => 1 - (1 - t) ** 3
// dépasse un peu 1 avant de s'y poser (petit rebond)
export const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
// matrice d'une instance cachée (échelle nulle) ; ne jamais la modifier
export const HIDDEN = new Matrix4().makeScale(0, 0, 0)
