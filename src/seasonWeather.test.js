import { describe, it, expect } from 'vitest'
import { seasonFromDate, weatherFromCode, effectiveWeather, weatherLabel, roundCoord } from './seasonWeather.js'

describe('seasonFromDate', () => {
  it('suit les saisons météorologiques', () => {
    expect(seasonFromDate(new Date(2026, 10, 30))).toBe('automne')
    expect(seasonFromDate(new Date(2026, 11, 1))).toBe('hiver')
    expect(seasonFromDate(new Date(2028, 1, 29))).toBe('hiver')
    expect(seasonFromDate(new Date(2027, 2, 1))).toBe('printemps')
    expect(seasonFromDate(new Date(2026, 5, 1))).toBe('ete')
  })
  it("décale de 6 mois dans l'hémisphère sud", () => {
    expect(seasonFromDate(new Date(2026, 6, 14), true)).toBe('hiver')
    expect(seasonFromDate(new Date(2026, 0, 10), true)).toBe('ete')
  })
})

describe('weatherFromCode', () => {
  it.each([
    [0, 'degage'], [1, 'degage'], [2, 'nuageux'], [3, 'nuageux'], [45, 'nuageux'], [48, 'nuageux'],
    [51, 'pluie'], [61, 'pluie'], [67, 'pluie'], [71, 'pluie'], [77, 'pluie'], [80, 'pluie'], [86, 'pluie'],
    [95, 'orage'], [96, 'orage'], [99, 'orage'], [12345, 'degage'],
  ])('%i → %s', (code, w) => expect(weatherFromCode(code)).toBe(w))
})

describe("règles d'hiver", () => {
  it("pas d'orage en hiver", () => {
    expect(effectiveWeather('hiver', 'orage')).toBe('pluie')
    expect(effectiveWeather('automne', 'orage')).toBe('orage')
  })
  it('la pluie devient de la neige', () => {
    expect(weatherLabel('pluie', 'hiver')).toBe('Neige')
    expect(weatherLabel('pluie', 'ete')).toBe('Pluie')
    expect(weatherLabel('degage', 'hiver')).toBe('Dégagé')
  })
})

it('roundCoord arrondit à ~10 km', () => {
  expect(roundCoord(43.6468)).toBe(43.6)
  expect(roundCoord(-33.8688)).toBe(-33.9)
})
