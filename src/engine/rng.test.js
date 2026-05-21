import { describe, it, expect } from 'vitest'
import { mulberry32, seedFromString, randomSeed } from './rng.js'

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic — same seed gives same sequence', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b())
    }
  })

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('seed 0 still produces valid output', () => {
    const rng = mulberry32(0)
    expect(() => rng()).not.toThrow()
    expect(rng()).toBeGreaterThanOrEqual(0)
  })
})

describe('seedFromString', () => {
  it('returns a non-negative integer', () => {
    const s = seedFromString('hello')
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
  })

  it('same string always gives same seed', () => {
    expect(seedFromString('atlas')).toBe(seedFromString('atlas'))
  })

  it('different strings give different seeds', () => {
    expect(seedFromString('atlas')).not.toBe(seedFromString('engine'))
  })
})

describe('randomSeed', () => {
  it('returns a non-negative integer', () => {
    const s = randomSeed()
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
  })

  it('produces different values on successive calls', () => {
    // Technically not guaranteed but astronomically unlikely to collide
    const values = new Set(Array.from({ length: 20 }, () => randomSeed()))
    expect(values.size).toBeGreaterThan(1)
  })
})
