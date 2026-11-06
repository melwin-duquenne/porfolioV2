import { describe, it, expect, vi } from 'vitest'
import { createSeasonWeather } from './useSeasonWeather.js'

const memStorage = () => {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}
const throwingStorage = {
  getItem: () => {
    throw new Error('denied')
  },
  setItem: () => {
    throw new Error('denied')
  },
  removeItem: () => {
    throw new Error('denied')
  },
}
const NOV_6 = () => new Date(2026, 10, 6)

const make = (over = {}) =>
  createSeasonWeather({
    storage: memStorage(),
    fetchCode: vi.fn().mockResolvedValue(null),
    geolocation: undefined,
    now: NOV_6,
    ...over,
  })

describe('mode automatique', () => {
  it('auto par défaut : automne (6 nov.) et dégagé avant réponse', () => {
    const sw = make()
    expect(sw.effective.value).toEqual({ season: 'automne', weather: 'degage' })
    expect(sw.isAuto.value).toBe(true)
  })

  it('refresh interroge Auch et applique le code', async () => {
    const fetchCode = vi.fn().mockResolvedValue(95)
    const sw = make({ fetchCode })
    await sw.refresh()
    expect(fetchCode).toHaveBeenCalledWith(43.65, 0.59)
    expect(sw.autoWeather.value).toBe('orage')
    expect(sw.effective.value.weather).toBe('orage')
  })

  it('API injoignable → reste dégagé', async () => {
    const sw = make({ fetchCode: vi.fn().mockResolvedValue(null) })
    await expect(sw.refresh()).resolves.toBeUndefined()
    expect(sw.autoWeather.value).toBe('degage')
  })

  it('cache 30 min : pas de 2e appel', async () => {
    const storage = memStorage()
    const fetchCode = vi.fn().mockResolvedValue(3)
    await make({ storage, fetchCode }).refresh()
    const again = make({ storage, fetchCode })
    await again.refresh()
    expect(fetchCode).toHaveBeenCalledTimes(1)
    expect(again.autoWeather.value).toBe('nuageux')
  })

  it('cache périmé après 30 min : nouvel appel', async () => {
    const storage = memStorage()
    const fetchCode = vi.fn().mockResolvedValue(3)
    await make({ storage, fetchCode }).refresh()
    await make({ storage, fetchCode, now: () => new Date(2026, 10, 6, 0, 31) }).refresh()
    expect(fetchCode).toHaveBeenCalledTimes(2)
  })
})

describe('choix manuels', () => {
  it('indépendants et persistés pour la visite', () => {
    const storage = memStorage()
    const sw = make({ storage })
    sw.setSeason('ete')
    expect(sw.effective.value).toEqual({ season: 'ete', weather: 'degage' })
    expect(sw.manualWeather.value).toBeNull()
    expect(storage.getItem('sw-season')).toBe('ete')
    expect(make({ storage }).manualSeason.value).toBe('ete')
  })

  it('resetAuto efface les deux choix', () => {
    const storage = memStorage()
    const sw = make({ storage })
    sw.setSeason('ete')
    sw.setWeather('nuageux')
    sw.resetAuto()
    expect(sw.isAuto.value).toBe(true)
    expect(sw.effective.value).toEqual({ season: 'automne', weather: 'degage' })
    expect(make({ storage }).isAuto.value).toBe(true)
  })

  it('orage forcé puis hiver → pluie, et le reste au retour en automne', () => {
    const sw = make()
    sw.setWeather('orage')
    sw.setSeason('hiver')
    expect(sw.manualWeather.value).toBe('pluie')
    sw.setSeason('automne')
    expect(sw.effective.value.weather).toBe('pluie')
  })

  it('orage refusé en hiver', () => {
    const sw = make()
    sw.setSeason('hiver')
    sw.setWeather('orage')
    expect(sw.manualWeather.value).toBeNull()
  })

  it('orage auto en hiver → pluie (neige)', async () => {
    const sw = make({ fetchCode: vi.fn().mockResolvedValue(95), now: () => new Date(2026, 0, 10) })
    await sw.refresh()
    expect(sw.effective.value).toEqual({ season: 'hiver', weather: 'pluie' })
  })

  it('stockage qui lève → fonctionne en mémoire', () => {
    const sw = make({ storage: throwingStorage })
    expect(() => sw.setSeason('hiver')).not.toThrow()
    expect(sw.effective.value.season).toBe('hiver')
  })
})

describe('météo locale (opt-in)', () => {
  const geo = (pos) => ({ getCurrentPosition: (ok) => ok({ coords: pos }) })
  const refused = { getCurrentPosition: (ok, err) => err({ code: 1 }) }

  it('acceptée : coords arrondies, cache ignoré, hémisphère sud', async () => {
    const storage = memStorage()
    const fetchCode = vi.fn().mockResolvedValue(0)
    await make({ storage, fetchCode }).refresh() // cache Auch
    const sw = make({ storage, fetchCode, geolocation: geo({ latitude: -33.8688, longitude: 151.2093 }) })
    await sw.useLocalWeather()
    expect(fetchCode).toHaveBeenLastCalledWith(-33.9, 151.2)
    expect(sw.local.value).toBe(true)
    expect(sw.effective.value.season).toBe('printemps') // 6 nov. au sud
    expect(JSON.parse(storage.getItem('sw-coords'))).toEqual({ lat: -33.9, lon: 151.2 })
  })

  it('refusée → Auch, local false, pas de requête', async () => {
    const fetchCode = vi.fn().mockResolvedValue(0)
    const sw = make({ fetchCode, geolocation: refused })
    await sw.useLocalWeather()
    expect(sw.local.value).toBe(false)
    expect(fetchCode).not.toHaveBeenCalled()
  })

  it('acceptée puis échec au 2e clic → garde la position locale, sans état incohérent', async () => {
    const storage = memStorage()
    let answer = (ok) => ok({ coords: { latitude: -33.8688, longitude: 151.2093 } })
    const geolocation = { getCurrentPosition: (ok, err) => answer(ok, err) }
    const fetchCode = vi.fn().mockResolvedValue(61)
    const sw = make({ storage, fetchCode, geolocation })
    await sw.useLocalWeather()
    answer = (ok, err) => err({ code: 3 }) // délai dépassé
    await sw.useLocalWeather()
    expect(sw.local.value).toBe(true)
    expect(sw.effective.value).toEqual({ season: 'printemps', weather: 'pluie' })
    await sw.refresh({ force: true })
    expect(fetchCode).toHaveBeenLastCalledWith(-33.9, 151.2)
  })

  it("réponse d'Auch arrivée après la météo locale → ignorée", async () => {
    let releaseAuch
    const fetchCode = vi.fn((lat) =>
      lat === 43.65 ? new Promise((r) => (releaseAuch = () => r(0))) : Promise.resolve(95)
    )
    const sw = make({ fetchCode, geolocation: geo({ latitude: 48.85, longitude: 2.35 }) })
    const first = sw.refresh() // Auch, lent
    await sw.useLocalWeather() // Paris, rapide
    releaseAuch()
    await first
    expect(sw.autoWeather.value).toBe('orage')
  })

  it('pas de géolocalisation disponible → local false', async () => {
    const sw = make({ geolocation: undefined })
    await expect(sw.useLocalWeather()).resolves.toBeUndefined()
    expect(sw.local.value).toBe(false)
  })
})
