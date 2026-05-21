import { describe, it, expect } from 'vitest'
import { generateWorldName } from './worldname.js'

describe('generateWorldName', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateWorldName(42)).toBe('string')
    expect(generateWorldName(42).length).toBeGreaterThan(0)
  })

  it('is deterministic — same seed gives same name', () => {
    expect(generateWorldName(99999)).toBe(generateWorldName(99999))
  })

  it('different seeds produce different names', () => {
    const names = new Set(
      Array.from({ length: 50 }, (_, i) => generateWorldName(i * 1337))
    )
    // Should have at least several distinct names across 50 seeds
    expect(names.size).toBeGreaterThan(10)
  })

  it('name contains only alphabetic characters', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(generateWorldName(seed)).toMatch(/^[A-Za-z]+$/)
    }
  })
})
