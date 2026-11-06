import { it, expect } from 'vitest'
import { Matrix4, Vector3 } from 'three'
import { buildFallingLeaves } from './ambient.js'

it("feuilles lancées en direct (menu) : elles s'étalent en hauteur, pas une seule bande", () => {
  const leaves = buildFallingLeaves(['#e3b23c'])
  for (let i = 0; i < 1200; i++) leaves.update(0.1, 1) // 2 min de scène, automne choisi en direct
  const m = new Matrix4()
  const p = new Vector3()
  const ys = []
  for (let i = 0; i < leaves.object.count; i++) {
    leaves.object.getMatrixAt(i, m)
    p.setFromMatrixPosition(m)
    ys.push(p.y)
  }
  ys.sort((a, b) => a - b)
  // écart entre le 10e et le 90e centile : la bande d'origine fait ~1–2 u sur 13
  const spread = ys[Math.floor(ys.length * 0.9)] - ys[Math.floor(ys.length * 0.1)]
  expect(spread).toBeGreaterThan(6)
})
