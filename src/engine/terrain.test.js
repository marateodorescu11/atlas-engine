import { describe, it, expect } from 'vitest'
import { generateHeightmap, TERRAIN } from './terrain.js'

const SEED = 0xdeadbeef
const W = 40
const H = 30

describe('generateHeightmap', () => {
  it('returns a 2D array of the requested dimensions', () => {
    const map = generateHeightmap(W, H, SEED)
    expect(map).toHaveLength(H)
    map.forEach(row => expect(row).toHaveLength(W))
  })

  it('every cell has height in [0, 1]', () => {
    const map = generateHeightmap(W, H, SEED)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        expect(map[y][x].height).toBeGreaterThanOrEqual(0)
        expect(map[y][x].height).toBeLessThanOrEqual(1)
      }
    }
  })

  it('every cell has a valid terrain type', () => {
    const validIds = new Set(Object.values(TERRAIN).map(t => t.id))
    const map = generateHeightmap(W, H, SEED)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        expect(validIds.has(map[y][x].terrain.id)).toBe(true)
      }
    }
  })

  it('is deterministic — same seed produces identical maps', () => {
    const a = generateHeightmap(W, H, SEED)
    const b = generateHeightmap(W, H, SEED)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        expect(a[y][x].height).toBe(b[y][x].height)
        expect(a[y][x].terrain.id).toBe(b[y][x].terrain.id)
      }
    }
  })

  it('different seeds produce different maps', () => {
    const a = generateHeightmap(W, H, 111)
    const b = generateHeightmap(W, H, 999)
    let differences = 0
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (a[y][x].terrain.id !== b[y][x].terrain.id) differences++
      }
    }
    expect(differences).toBeGreaterThan(0)
  })

  it('island mask ensures map edges are deep ocean', () => {
    const map = generateHeightmap(W, H, SEED)
    // Top-left and bottom-right corners should be ocean (island mask fades edges)
    expect(map[0][0].terrain.id).toBe(TERRAIN.DEEP_OCEAN.id)
    expect(map[H - 1][W - 1].terrain.id).toBe(TERRAIN.DEEP_OCEAN.id)
  })

  it('map contains at least 4 distinct terrain types for reasonable seeds', () => {
    const map = generateHeightmap(80, 60, SEED)
    const types = new Set()
    for (let y = 0; y < 60; y++)
      for (let x = 0; x < 80; x++)
        types.add(map[y][x].terrain.id)
    expect(types.size).toBeGreaterThanOrEqual(4)
  })
})

describe('TERRAIN constants', () => {
  it('deep ocean is impassable', () => {
    expect(TERRAIN.DEEP_OCEAN.cost).toBe(Infinity)
  })

  it('shallow water is traversable but costly', () => {
    expect(TERRAIN.SHALLOW_WATER.cost).toBeGreaterThan(1)
    expect(TERRAIN.SHALLOW_WATER.cost).not.toBe(Infinity)
  })

  it('mountains cost more than plains', () => {
    expect(TERRAIN.MOUNTAIN.cost).toBeGreaterThan(TERRAIN.PLAINS.cost)
  })

  it('snow peaks are the most expensive traversable terrain', () => {
    const traversable = Object.values(TERRAIN).filter(t => t.cost !== Infinity)
    const maxCost = Math.max(...traversable.map(t => t.cost))
    expect(TERRAIN.SNOW.cost).toBe(maxCost)
  })

  it('all terrain types have unique ids', () => {
    const ids = Object.values(TERRAIN).map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
