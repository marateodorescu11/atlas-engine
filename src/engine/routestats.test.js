import { describe, it, expect } from 'vitest'
import { analyseRoute } from './routestats.js'
import { TERRAIN } from './terrain.js'

function makeCell(terrain) {
  return { terrain, height: 0.5, moisture: 0.5, temperature: 0.5 }
}

function makeMap(w, h, fill) {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => makeCell(fill))
  )
}

function straightPath(x1, y1, x2, y2) {
  const path = []
  const dx = Math.sign(x2 - x1)
  const dy = Math.sign(y2 - y1)
  let x = x1, y = y1
  while (x !== x2 || y !== y2) {
    path.push({ x, y })
    x += dx; y += dy
  }
  path.push({ x: x2, y: y2 })
  return path
}

describe('analyseRoute', () => {
  it('returns null for an empty path', () => {
    const map = makeMap(10, 10, TERRAIN.PLAINS)
    expect(analyseRoute(map, null, 0, 0, 9, 9)).toBeNull()
    expect(analyseRoute(map, [],   0, 0, 9, 9)).toBeNull()
  })

  it('reports correct step count', () => {
    const map = makeMap(10, 10, TERRAIN.PLAINS)
    const path = straightPath(0, 0, 9, 0)
    const stats = analyseRoute(map, path, 0, 0, 9, 0)
    expect(stats.steps).toBe(path.length)
  })

  it('calculates total cost as sum of terrain costs along the path', () => {
    const map = makeMap(5, 1, TERRAIN.PLAINS)
    const path = [0,1,2,3,4].map(x => ({ x, y: 0 }))
    const stats = analyseRoute(map, path, 0, 0, 4, 0)
    // Plains cost = 1.0, 5 steps
    expect(stats.cost).toBeCloseTo(5 * TERRAIN.PLAINS.cost, 5)
  })

  it('detour ratio is close to 1 for a near-straight path', () => {
    // 20 cells cover a distance of 19 — ratio = 20/19 ≈ 1.05
    // Accept anything < 1.15 as "essentially straight"
    const map = makeMap(20, 1, TERRAIN.PLAINS)
    const path = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0 }))
    const stats = analyseRoute(map, path, 0, 0, 19, 0)
    expect(stats.detourRatio).toBeLessThan(1.15)
  })

  it('detour ratio is > 1 for a path much longer than straight-line', () => {
    const map = makeMap(10, 10, TERRAIN.PLAINS)
    // Explicit cell-by-cell detour: (0,0) → down to (0,9) → across to (9,9) → up to (9,0)
    // Path length ~28, straight-line (0,0)→(9,0) = 9 → ratio ≈ 3.1
    const path = [
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0, y: i })),       // down
      ...Array.from({ length: 9  }, (_, i) => ({ x: i + 1, y: 9 })),   // right
      ...Array.from({ length: 10 }, (_, i) => ({ x: 9, y: 9 - i })),   // up
    ]
    const stats = analyseRoute(map, path, 0, 0, 9, 0)
    expect(stats.detourRatio).toBeGreaterThan(1)
  })

  it('breakdown lists only terrains actually on the path', () => {
    const map = makeMap(10, 1, TERRAIN.PLAINS)
    map[0][5] = makeCell(TERRAIN.FOREST)
    const path = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }))
    const stats = analyseRoute(map, path, 0, 0, 9, 0)
    const names = stats.breakdown.map(b => b.name)
    expect(names).toContain(TERRAIN.PLAINS.name)
    expect(names).toContain(TERRAIN.FOREST.name)
    expect(names).not.toContain(TERRAIN.MOUNTAIN.name)
  })

  it('breakdown step counts sum to total path length', () => {
    const map = makeMap(10, 1, TERRAIN.PLAINS)
    const path = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }))
    const stats = analyseRoute(map, path, 0, 0, 9, 0)
    const total = stats.breakdown.reduce((s, b) => s + b.steps, 0)
    expect(total).toBe(stats.steps)
  })

  it('produces a non-empty narrative string', () => {
    const map = makeMap(10, 10, TERRAIN.PLAINS)
    const path = straightPath(0, 0, 9, 9)
    const stats = analyseRoute(map, path, 0, 0, 9, 9)
    expect(typeof stats.narrative).toBe('string')
    expect(stats.narrative.length).toBeGreaterThan(0)
  })
})
