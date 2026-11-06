import { it, expect, vi } from 'vitest'
import { fetchWeatherCode } from './openMeteo.js'

const ok = (body) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

it('renvoie le code météo courant et appelle la bonne URL', async () => {
  const f = ok({ current: { weather_code: 61 } })
  expect(await fetchWeatherCode(43.65, 0.59, f)).toBe(61)
  expect(f.mock.calls[0][0]).toBe(
    'https://api.open-meteo.com/v1/forecast?latitude=43.65&longitude=0.59&current=weather_code'
  )
})

it.each([
  ['réseau', () => vi.fn().mockRejectedValue(new Error('offline'))],
  ['statut', () => vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })],
  ['champ absent', () => ok({ current: {} })],
  [
    'JSON invalide',
    () =>
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('bad')
        },
      }),
  ],
])('null sur erreur (%s)', async (_, make) => {
  expect(await fetchWeatherCode(1, 2, make())).toBeNull()
})
