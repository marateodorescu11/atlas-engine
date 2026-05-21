import { TERRAIN } from './terrain.js'
import { mulberry32 } from './rng.js'

const PREFIXES = ['Iron', 'Silver', 'Golden', 'Black', 'White', 'Storm', 'Frost', 'Ember', 'Shadow', 'Moon', 'Sun', 'Ash', 'Crimson', 'Ancient', 'Lost']
const MOUNTAIN_NAMES = ['Peak', 'Summit', 'Crag', 'Ridge', 'Horn', 'Spire', 'Pinnacle']
const FOREST_NAMES = ['Wood', 'Grove', 'Thicket', 'Hollow', 'Glade', 'Copse', 'Weald']
const PLAINS_NAMES = ['Vale', 'Reach', 'Field', 'Flats', 'Downs', 'Moor', 'Heath']
const SHORE_NAMES = ['Cove', 'Bay', 'Haven', 'Landing', 'Cape', 'Point', 'Inlet']

function pickName(rng, terrain) {
  const prefix = PREFIXES[Math.floor(rng() * PREFIXES.length)]
  let suffix
  if (terrain.id === TERRAIN.MOUNTAIN.id || terrain.id === TERRAIN.SNOW.id) {
    suffix = MOUNTAIN_NAMES[Math.floor(rng() * MOUNTAIN_NAMES.length)]
  } else if (terrain.id === TERRAIN.FOREST.id) {
    suffix = FOREST_NAMES[Math.floor(rng() * FOREST_NAMES.length)]
  } else if (terrain.id === TERRAIN.SHORE.id) {
    suffix = SHORE_NAMES[Math.floor(rng() * SHORE_NAMES.length)]
  } else {
    suffix = PLAINS_NAMES[Math.floor(rng() * PLAINS_NAMES.length)]
  }
  return `${prefix} ${suffix}`
}

export function generateLandmarks(map, seed, count = 18) {
  const rng = mulberry32(seed ^ 0xdeadbeef)
  const rows = map.length
  const cols = map[0].length
  const landmarks = []
  const usedTerrains = new Set([TERRAIN.DEEP_OCEAN.id, TERRAIN.SHALLOW_WATER.id])
  const grid = 4 // minimum cell separation in grid units
  const placed = []

  let attempts = 0
  while (landmarks.length < count && attempts < count * 40) {
    attempts++
    const x = Math.floor(rng() * (cols - 20)) + 10
    const y = Math.floor(rng() * (rows - 20)) + 10
    const cell = map[y][x]
    if (usedTerrains.has(cell.terrain.id)) continue

    // Ensure spatial spread
    const tooClose = placed.some(p => Math.abs(p.x - x) < cols / grid && Math.abs(p.y - y) < rows / grid)
    if (tooClose) continue

    placed.push({ x, y })
    landmarks.push({ x, y, name: pickName(rng, cell.terrain), terrain: cell.terrain })
  }
  return landmarks
}
