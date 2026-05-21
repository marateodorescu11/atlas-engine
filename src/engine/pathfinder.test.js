import { describe, it, expect } from 'vitest'
import { findPath } from './pathfinder.js'
import { TERRAIN } from './terrain.js'

// ── Map builder helpers ───────────────────────────────────────────────────────

function makeCell(terrain) {
  return { terrain, height: 0.5, moisture: 0.5, temperature: 0.5 }
}

/** Build a W×H grid filled with `fill` terrain, with optional cell overrides. */
function makeMap(w, h, fill, overrides = []) {
  const map = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => makeCell(fill))
  )
  for (const { x, y, terrain } of overrides) {
    map[y][x] = makeCell(terrain)
  }
  return map
}

// ── Basic connectivity ────────────────────────────────────────────────────────

describe('findPath — basic routing', () => {
  it('returns a path from start to end on open terrain', () => {
    const map = makeMap(10, 10, TERRAIN.PLAINS)
    const path = findPath(map, 0, 0, 9, 9)
    expect(path).not.toBeNull()
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[path.length - 1]).toEqual({ x: 9, y: 9 })
  })

  it('returns null when start is on impassable terrain', () => {
    const map = makeMap(5, 5, TERRAIN.PLAINS, [{ x: 0, y: 0, terrain: TERRAIN.DEEP_OCEAN }])
    expect(findPath(map, 0, 0, 4, 4)).toBeNull()
  })

  it('returns null when destination is on impassable terrain', () => {
    const map = makeMap(5, 5, TERRAIN.PLAINS, [{ x: 4, y: 4, terrain: TERRAIN.DEEP_OCEAN }])
    expect(findPath(map, 0, 0, 4, 4)).toBeNull()
  })

  it('returns a single-element path when start equals destination', () => {
    const map = makeMap(5, 5, TERRAIN.PLAINS)
    const path = findPath(map, 2, 2, 2, 2)
    expect(path).toHaveLength(1)
    expect(path[0]).toEqual({ x: 2, y: 2 })
  })

  it('path always starts at origin and ends at destination', () => {
    const map = makeMap(20, 15, TERRAIN.PLAINS)
    const path = findPath(map, 1, 1, 18, 13)
    expect(path[0]).toEqual({ x: 1, y: 1 })
    expect(path[path.length - 1]).toEqual({ x: 18, y: 13 })
  })
})

// ── Impassable terrain avoidance ──────────────────────────────────────────────

describe('findPath — impassable terrain', () => {
  it('routes around a wall of deep ocean', () => {
    // 10×5 grid with a vertical ocean wall at x=5, gap at y=4
    const overrides = [0, 1, 2, 3].map(y => ({ x: 5, y, terrain: TERRAIN.DEEP_OCEAN }))
    const map = makeMap(10, 5, TERRAIN.PLAINS, overrides)
    const path = findPath(map, 0, 0, 9, 0)

    expect(path).not.toBeNull()
    // Path must not pass through any ocean cell
    for (const { x, y } of path) {
      expect(map[y][x].terrain.cost).not.toBe(Infinity)
    }
  })

  it('returns null when destination is completely surrounded by ocean', () => {
    // Island of plains at (5,5) in a sea of ocean, destination cut off
    const map = makeMap(11, 11, TERRAIN.DEEP_OCEAN, [{ x: 5, y: 5, terrain: TERRAIN.PLAINS }])
    // Start is also isolated
    map[0][0] = makeCell(TERRAIN.PLAINS)
    expect(findPath(map, 0, 0, 5, 5)).toBeNull()
  })

  it('path never steps on impassable cells', () => {
    const map = makeMap(15, 10, TERRAIN.PLAINS)
    // Scatter some ocean cells
    for (let x = 3; x < 12; x++) map[5][x] = makeCell(TERRAIN.DEEP_OCEAN)
    const path = findPath(map, 0, 0, 14, 9)
    if (path) {
      for (const { x, y } of path) {
        expect(map[y][x].terrain.cost).not.toBe(Infinity)
      }
    }
  })
})

// ── Cost-awareness ────────────────────────────────────────────────────────────

describe('findPath — terrain cost preference', () => {
  it('prefers cheap plains over expensive mountains when both routes exist', () => {
    // Two corridors from left to right:
    //   Row 0: mountains (cost ×4)
    //   Row 1: plains   (cost ×1)
    const map = makeMap(10, 2, TERRAIN.PLAINS)
    for (let x = 0; x < 10; x++) map[0][x] = makeCell(TERRAIN.MOUNTAIN)

    const path = findPath(map, 0, 0, 9, 0)
    // A* should route through row 1 (plains) and arrive at (9,0)
    // Most cells visited should be plains
    const plainSteps = path.filter(p => map[p.y][p.x].terrain.id === TERRAIN.PLAINS.id).length
    const mountainSteps = path.filter(p => map[p.y][p.x].terrain.id === TERRAIN.MOUNTAIN.id).length
    expect(plainSteps).toBeGreaterThan(mountainSteps)
  })

  it('takes a longer plain path over a shorter mountain path', () => {
    // 5-wide grid: direct route through mountains vs detour through plains
    // Layout (5×3):
    //   .  M  M  M  .
    //   .  .  .  .  .
    //   .  .  .  .  .
    // Start (0,0) → End (4,0): shortest path goes through mountains
    // but cheaper path goes around via rows 1-2
    const map = makeMap(5, 3, TERRAIN.PLAINS)
    map[0][1] = makeCell(TERRAIN.MOUNTAIN)
    map[0][2] = makeCell(TERRAIN.MOUNTAIN)
    map[0][3] = makeCell(TERRAIN.MOUNTAIN)

    const path = findPath(map, 0, 0, 4, 0)
    expect(path).not.toBeNull()

    const mountainSteps = path.filter(p => map[p.y][p.x].terrain.id === TERRAIN.MOUNTAIN.id).length
    // Should avoid or minimise mountain steps
    expect(mountainSteps).toBeLessThan(3)
  })
})

// ── Path validity ─────────────────────────────────────────────────────────────

describe('findPath — path structure', () => {
  it('path consists of connected cells (each step is adjacent)', () => {
    const map = makeMap(20, 20, TERRAIN.PLAINS)
    const path = findPath(map, 0, 0, 19, 19)
    expect(path).not.toBeNull()
    for (let i = 1; i < path.length; i++) {
      const dx = Math.abs(path[i].x - path[i - 1].x)
      const dy = Math.abs(path[i].y - path[i - 1].y)
      // Each step moves at most 1 cell in any direction (8-directional)
      expect(dx).toBeLessThanOrEqual(1)
      expect(dy).toBeLessThanOrEqual(1)
      expect(dx + dy).toBeGreaterThan(0)
    }
  })

  it('path length on open terrain is close to straight-line distance', () => {
    const map = makeMap(20, 20, TERRAIN.PLAINS)
    const path = findPath(map, 0, 0, 19, 19)
    const straightLine = Math.sqrt(19 * 19 + 19 * 19)
    // Octile distance path should be at most ~40% longer than straight line
    expect(path.length).toBeLessThan(straightLine * 1.4)
  })

  it('all path coordinates are within map bounds', () => {
    const map = makeMap(10, 8, TERRAIN.PLAINS)
    const path = findPath(map, 0, 0, 9, 7)
    for (const { x, y } of path) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(10)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(8)
    }
  })
})
