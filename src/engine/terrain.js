import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from './rng.js'

export const TERRAIN = {
  DEEP_OCEAN:    { id: 0, name: 'Deep Ocean',    color: '#1a3a5c', cost: Infinity },
  SHALLOW_WATER: { id: 1, name: 'Shallow Water', color: '#2b6cb0', cost: Infinity },
  SHORE:         { id: 2, name: 'Shore',          color: '#c9a96e', cost: 1.2 },
  PLAINS:        { id: 3, name: 'Plains',         color: '#6aaa5a', cost: 1.0 },
  FOREST:        { id: 4, name: 'Forest',         color: '#2d6a34', cost: 1.8 },
  MOUNTAIN:      { id: 5, name: 'Mountain',       color: '#7a6652', cost: 4.0 },
  SNOW:          { id: 6, name: 'Snow Peak',      color: '#e8eaf0', cost: 6.0 },
}

const TERRAIN_LEVELS = [
  { max: 0.30, terrain: TERRAIN.DEEP_OCEAN    },
  { max: 0.42, terrain: TERRAIN.SHALLOW_WATER },
  { max: 0.48, terrain: TERRAIN.SHORE         },
  { max: 0.62, terrain: TERRAIN.PLAINS        },
  { max: 0.74, terrain: TERRAIN.FOREST        },
  { max: 0.86, terrain: TERRAIN.MOUNTAIN      },
  { max: 1.00, terrain: TERRAIN.SNOW          },
]

function classifyHeight(h) {
  for (const level of TERRAIN_LEVELS) {
    if (h <= level.max) return level.terrain
  }
  return TERRAIN.SNOW
}

export function generateHeightmap(width, height, seed) {
  const rng = mulberry32(seed)
  const noise2D = createNoise2D(rng)

  const scale = 3.5
  const octaves = [
    { freq: 1.0, amp: 1.00 },
    { freq: 2.0, amp: 0.50 },
    { freq: 4.0, amp: 0.25 },
    { freq: 8.0, amp: 0.13 },
    { freq: 16.0, amp: 0.06 },
  ]
  const totalAmp = octaves.reduce((s, o) => s + o.amp, 0)

  const map = new Array(height)
  for (let y = 0; y < height; y++) {
    map[y] = new Array(width)
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * scale
      const ny = (y / height) * scale

      let v = 0
      for (const { freq, amp } of octaves) {
        v += noise2D(nx * freq, ny * freq) * amp
      }
      const h = (v / totalAmp + 1) / 2

      // Slight island mask — fade edges to ocean
      const dx = (x / width) * 2 - 1
      const dy = (y / height) * 2 - 1
      const d = Math.sqrt(dx * dx + dy * dy)
      const masked = h * (1 - Math.pow(Math.max(0, d - 0.3) / 0.7, 2) * 0.9)

      map[y][x] = {
        height: Math.max(0, Math.min(1, masked)),
        terrain: classifyHeight(Math.max(0, Math.min(1, masked))),
      }
    }
  }
  return map
}
