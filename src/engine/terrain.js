import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from './rng.js'

export const TERRAIN = {
  DEEP_OCEAN:    { id: 0, name: 'Deep Ocean',    color: '#1a3a5c', cost: Infinity },
  SHALLOW_WATER: { id: 1, name: 'Shallow Water', color: '#2b6cb0', cost: 3.0 },
  SHORE:         { id: 2, name: 'Beach',          color: '#c9a96e', cost: 1.0 },
  PLAINS:        { id: 3, name: 'Plains',         color: '#6aaa5a', cost: 1.0 },
  FOREST:        { id: 4, name: 'Forest',         color: '#2d6a34', cost: 2.0 },
  HILLS:         { id: 5, name: 'Hills',          color: '#8a7560', cost: 2.5 },
  MOUNTAIN:      { id: 6, name: 'Mountains',      color: '#6b6b6b', cost: 4.0 },
  SNOW:          { id: 7, name: 'Snow Peak',      color: '#e8eaf0', cost: 6.0 },
}

function octaveNoise(noise2D, x, y, octaves) {
  const totalAmp = octaves.reduce((s, o) => s + o.amp, 0)
  let v = 0
  for (const { freq, amp } of octaves) v += noise2D(x * freq, y * freq) * amp
  return v / totalAmp
}

export function generateHeightmap(width, height, seed) {
  const rng1 = mulberry32(seed)
  const rng2 = mulberry32(seed ^ 0x9e3779b9)
  const rng3 = mulberry32(seed ^ 0x517cc1b7)

  const heightNoise  = createNoise2D(rng1)
  const moistureNoise = createNoise2D(rng2)
  const tempNoise    = createNoise2D(rng3)

  const heightOctaves = [
    { freq: 1.0,  amp: 1.00 },
    { freq: 2.1,  amp: 0.50 },
    { freq: 4.3,  amp: 0.25 },
    { freq: 8.7,  amp: 0.12 },
    { freq: 17.3, amp: 0.06 },
  ]
  const moistureOctaves = [
    { freq: 0.8, amp: 1.0 },
    { freq: 2.0, amp: 0.5 },
    { freq: 5.0, amp: 0.25 },
  ]
  const tempOctaves = [
    { freq: 0.6, amp: 1.0 },
    { freq: 1.8, amp: 0.4 },
  ]

  const scale = 3.2

  const map = new Array(height)
  for (let y = 0; y < height; y++) {
    map[y] = new Array(width)
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * scale
      const ny = (y / height) * scale

      const rawH = (octaveNoise(heightNoise, nx, ny, heightOctaves) + 1) / 2
      const dx = (x / width) * 2 - 1
      const dy = (y / height) * 2 - 1
      const dist = Math.sqrt(dx * dx + dy * dy)
      const mask = 1 - Math.pow(Math.max(0, dist - 0.25) / 0.75, 2) * 0.95
      const h = Math.max(0, Math.min(1, rawH * mask))

      const moisture    = Math.max(0, Math.min(1, (octaveNoise(moistureNoise, nx * 0.7, ny * 0.7, moistureOctaves) + 1) / 2))
      const latFactor   = 1 - Math.abs((y / height) * 2 - 1) * 0.5
      const rawTemp     = (octaveNoise(tempNoise, nx * 0.5, ny * 0.5, tempOctaves) + 1) / 2
      const temperature = Math.max(0, Math.min(1, rawTemp * 0.4 + latFactor * 0.6 - h * 0.5))

      map[y][x] = { height: h, moisture, temperature, terrain: classifyTerrain(h, moisture, temperature) }
    }
  }
  return map
}

function classifyTerrain(h, moisture, temperature) {
  if (h < 0.30) return TERRAIN.DEEP_OCEAN
  if (h < 0.42) return TERRAIN.SHALLOW_WATER
  if (h < 0.47) return TERRAIN.SHORE
  if (h > 0.88) return TERRAIN.SNOW
  if (h > 0.80) return TERRAIN.MOUNTAIN
  if (h > 0.70) return TERRAIN.HILLS
  if (moisture > 0.55) return TERRAIN.FOREST
  return TERRAIN.PLAINS
}
