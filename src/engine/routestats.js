import { TERRAIN } from './terrain.js'

/**
 * Analyse a path and produce human-readable route statistics.
 * Also scans cells near the straight-line corridor to detect avoided terrain.
 */
export function analyseRoute(map, path, startX, startY, endX, endY) {
  if (!path?.length) return null

  const rows = map.length
  const cols = map[0].length

  // ── Path breakdown ────────────────────────────────────────────────────────
  const breakdown = {}
  let totalCost = 0

  for (const { x, y } of path) {
    const t = map[y][x].terrain
    if (t.cost !== Infinity) totalCost += t.cost
    if (!breakdown[t.id]) breakdown[t.id] = { id: t.id, name: t.name, color: t.color, steps: 0, cost: 0 }
    breakdown[t.id].steps++
    if (t.cost !== Infinity) breakdown[t.id].cost += t.cost
  }

  const sortedBreakdown = Object.values(breakdown).sort((a, b) => b.steps - a.steps)

  // ── Straight-line scan — what was avoided? ────────────────────────────────
  const scanWidth = 6 // cells either side of the straight line
  const avoidedClusters = { mountain: 0, water: 0 }

  // Sample points along the straight line
  const lineLen = Math.max(Math.abs(endX - startX), Math.abs(endY - startY))
  const sampledMountainCells = new Set()
  const sampledWaterCells = new Set()

  for (let s = 0; s <= lineLen; s++) {
    const t = lineLen === 0 ? 0 : s / lineLen
    const lx = Math.round(startX + (endX - startX) * t)
    const ly = Math.round(startY + (endY - startY) * t)

    for (let dy = -scanWidth; dy <= scanWidth; dy++) {
      for (let dx = -scanWidth; dx <= scanWidth; dx++) {
        const nx = lx + dx
        const ny = ly + dy
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const cell = map[ny][nx]
        const key = `${nx},${ny}`
        if (cell.terrain.id === TERRAIN.MOUNTAIN.id || cell.terrain.id === TERRAIN.SNOW.id) {
          sampledMountainCells.add(key)
        }
        if (cell.terrain.id === TERRAIN.DEEP_OCEAN.id || cell.terrain.id === TERRAIN.SHALLOW_WATER.id) {
          sampledWaterCells.add(key)
        }
      }
    }
  }

  // Count mountain cells that are NOT on the path
  const pathSet = new Set(path.map(p => `${p.x},${p.y}`))
  let avoidedMountainCells = 0
  let avoidedWaterCells = 0
  for (const k of sampledMountainCells) if (!pathSet.has(k)) avoidedMountainCells++
  for (const k of sampledWaterCells) if (!pathSet.has(k)) avoidedWaterCells++

  // Convert cell counts to rough "range" counts using blob estimation
  const mountainRanges = Math.round(avoidedMountainCells / 40)
  const waterBodies = Math.round(avoidedWaterCells / 60)

  // ── Efficiency score ──────────────────────────────────────────────────────
  // Compare actual path length to straight-line distance
  const straightDist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
  const detourRatio = path.length / Math.max(1, straightDist)

  // ── Narrative summary ─────────────────────────────────────────────────────
  const avoidedParts = []
  if (mountainRanges > 0) avoidedParts.push(`${mountainRanges} mountain ${mountainRanges === 1 ? 'range' : 'ranges'}`)
  if (waterBodies > 0) avoidedParts.push(`${waterBodies} water ${waterBodies === 1 ? 'body' : 'bodies'}`)

  let narrative = ''
  if (avoidedParts.length > 0) {
    narrative = `Navigated around ${avoidedParts.join(' and ')}`
  } else if (detourRatio < 1.15) {
    narrative = 'Near-straight route — clear terrain ahead'
  } else {
    narrative = 'Routed through mixed terrain'
  }

  // ── Dominant biome ────────────────────────────────────────────────────────
  const dominant = sortedBreakdown[0]?.name ?? ''

  return {
    steps: path.length,
    cost: totalCost,
    straightDist: Math.round(straightDist),
    detourRatio,
    breakdown: sortedBreakdown,
    mountainRanges,
    waterBodies,
    narrative,
    dominant,
  }
}
