import { TERRAIN } from './terrain.js'

// ── Static terrain color (no time dependency) ─────────────────────────────────

function terrainRGB(cell) {
  const { terrain: t, height: h, moisture: m = 0.5, temperature: temp = 0.5 } = cell

  switch (t.id) {
    case TERRAIN.DEEP_OCEAN.id: {
      const v = Math.floor(12 + h * 35)
      return [v + 3, v + 28, Math.min(255, v + 82)]
    }
    case TERRAIN.SHALLOW_WATER.id: {
      const warmth = temp * 28
      const v = Math.floor(40 + h * 50)
      return [v, Math.floor(v + 55 + warmth), Math.min(255, v + 120)]
    }
    case TERRAIN.SHORE.id: {
      const dryness = 1 - m
      const r = Math.floor(158 + dryness * 52 + h * 22)
      return [r, Math.floor(r * 0.82 + dryness * 10), Math.floor(r * 0.5)]
    }
    case TERRAIN.PLAINS.id: {
      if (temp > 0.65 && m < 0.45) {
        const v = Math.floor(138 + h * 42)
        return [v, Math.floor(v * 0.85), Math.floor(v * 0.24)]
      }
      if (temp < 0.3) {
        const v = Math.floor(98 + h * 52)
        return [Math.floor(v * 0.78), Math.floor(v * 0.85), Math.floor(v * 0.64)]
      }
      const g = Math.floor(92 + m * 72 + h * 52)
      return [Math.floor(g * (0.64 - m * 0.2)), g, Math.floor(g * (0.3 + m * 0.1))]
    }
    case TERRAIN.FOREST.id: {
      if (temp > 0.6 && m > 0.65) {
        const g = Math.floor(68 + h * 56)
        return [Math.floor(g * 0.28), Math.floor(g * 1.1), Math.floor(g * 0.35)]
      }
      if (temp < 0.3) {
        const g = Math.floor(42 + h * 56)
        return [Math.floor(g * 0.3), Math.floor(g * 0.85), Math.floor(g * 0.6)]
      }
      const g = Math.floor(52 + m * 42 + h * 42)
      return [Math.floor(g * 0.35), g, Math.floor(g * 0.28)]
    }
    case TERRAIN.HILLS.id: {
      const v = Math.floor(95 + h * 55)
      return [Math.floor(v * 0.78), Math.floor(v * 0.70), Math.floor(v * 0.54)]
    }
    case TERRAIN.MOUNTAIN.id: {
      const warm = temp * 20
      const v = Math.floor(70 + h * 88)
      return [v + Math.floor(warm), Math.floor(v * 0.86), Math.floor(v * 0.75 - warm * 0.5)]
    }
    case TERRAIN.SNOW.id: {
      const v = Math.floor(198 + h * 57)
      return [v, v, Math.min(255, v + 16)]
    }
    default:
      return [120, 120, 120]
  }
}

function lerpRGB(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function bilinearCell(map, fx, fy, rows, cols) {
  const x0 = Math.max(0, Math.min(cols - 1, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(rows - 1, Math.floor(fy)))
  const x1 = Math.min(cols - 1, x0 + 1)
  const y1 = Math.min(rows - 1, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0
  const c00 = terrainRGB(map[y0][x0])
  const c10 = terrainRGB(map[y0][x1])
  const c01 = terrainRGB(map[y1][x0])
  const c11 = terrainRGB(map[y1][x1])
  return lerpRGB(lerpRGB(c00, c10, tx), lerpRGB(c01, c11, tx), ty)
}

function logicalSize(canvas) {
  return { w: canvas._logicalW || canvas.width, h: canvas._logicalH || canvas.height }
}

// ── Offscreen terrain cache ───────────────────────────────────────────────────
// Built once per map. Stores the static pixel data so the animation loop
// never re-renders terrain — it just blits this bitmap.

let terrainCache = null    // OffscreenCanvas (or regular canvas fallback)
let heatmapCache = null    // pre-rendered heatmap overlay
let landmarkCache = null   // pre-rendered landmark layer
let landmarkCacheW = 0
let landmarkCacheH = 0

function makeOffscreen(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h)
  }
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

/**
 * Call once when a new map is generated.
 * Builds a full-resolution pixel bitmap of the static terrain.
 */
export function prerenderTerrain(canvas, map) {
  const pw = canvas.width
  const ph = canvas.height
  const rows = map.length
  const cols = map[0].length

  terrainCache = makeOffscreen(pw, ph)
  const ctx = terrainCache.getContext('2d')
  const imageData = ctx.createImageData(pw, ph)
  const data = imageData.data

  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      const fx = (px / pw) * cols
      const fy = (py / ph) * rows
      const mx = Math.min(cols - 1, Math.floor(fx))
      const my = Math.min(rows - 1, Math.floor(fy))
      const tid = map[my][mx].terrain.id

      let r, g, b
      if (
        tid === TERRAIN.DEEP_OCEAN.id ||
        tid === TERRAIN.SHALLOW_WATER.id ||
        tid === TERRAIN.SHORE.id
      ) {
        ;[r, g, b] = bilinearCell(map, fx, fy, rows, cols)
      } else {
        ;[r, g, b] = terrainRGB(map[my][mx])
      }

      const i = (py * pw + px) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Invalidate dependent caches
  heatmapCache = null
  landmarkCache = null
}

/**
 * Pre-render heatmap to an offscreen canvas.
 * Only called when the heatmap is first toggled on (or after a new map).
 */
export function prerenderHeatmap(canvas, map) {
  const { w, h } = logicalSize(canvas)
  const rows = map.length
  const cols = map[0].length
  const cw = w / cols
  const ch = h / rows
  const maxCost = 6.0

  heatmapCache = makeOffscreen(w, h)
  const ctx = heatmapCache.getContext('2d')

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cost = map[y][x].terrain.cost
      if (cost === Infinity) continue
      const t = Math.min(1, (cost - 1) / (maxCost - 1))
      ctx.fillStyle = `rgba(${Math.floor(t * 255)}, ${Math.floor((1 - t) * 150)}, 10, 0.38)`
      ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5)
    }
  }
}

/**
 * Pre-render landmark dots and labels to an offscreen canvas.
 * measureText is expensive; caching means it runs once per world, not 60×/sec.
 */
export function prerenderLandmarks(canvas, map, landmarks) {
  const { w, h } = logicalSize(canvas)
  const rows = map.length
  const cols = map[0].length
  const cw = w / cols
  const ch = h / rows

  landmarkCache = makeOffscreen(w, h)
  landmarkCacheW = w
  landmarkCacheH = h
  const ctx = landmarkCache.getContext('2d')

  ctx.font = '500 9.5px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  for (const lm of landmarks) {
    const px = (lm.x + 0.5) * cw
    const py = (lm.y + 0.5) * ch

    ctx.save()
    ctx.translate(px, py - 2)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(-3, -3, 6, 6)
    ctx.restore()

    const lw = ctx.measureText(lm.name).width + 8
    const lh = 14
    const lx = px - lw / 2
    const ly = py - 14

    ctx.fillStyle = 'rgba(0,0,0,0.58)'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(lx, ly, lw, lh, 2)
    else ctx.rect(lx, ly, lw, lh)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillText(lm.name, px, py - 3)
  }
}

// ── Per-frame composite ───────────────────────────────────────────────────────
// This is the hot path — called 60×/sec when water animation runs.
// It must be as cheap as possible: blit cached layers, then animate water only.

export function compositeFrame(canvas, map, time, { showHeatmap, showLandmarks, path, markers }) {
  if (!terrainCache) return
  const ctx = canvas.getContext('2d')
  const { w, h } = logicalSize(canvas)

  // 1. Blit static terrain (one GPU texture copy)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(terrainCache, 0, 0)
  ctx.restore()

  // 2. Animate water — O(water_cells), GPU-accelerated fillRect
  animateWater(ctx, map, time, w, h)

  // 3. Heatmap overlay (cached blit)
  if (showHeatmap && heatmapCache) {
    ctx.drawImage(heatmapCache, 0, 0)
  }

  // 4. Landmarks (cached blit)
  if (showLandmarks && landmarkCache) {
    ctx.drawImage(landmarkCache, 0, 0)
  }

  // 5. Path
  if (path?.length > 1) drawPath(ctx, map, path, w, h)

  // 6. Markers (cheap — max 2 circles)
  if (markers?.length) drawMarkers(ctx, map, markers, w, h)
}

function animateWater(ctx, map, time, w, h) {
  const rows = map.length
  const cols = map[0].length
  const cw = w / cols
  const ch = h / rows

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tid = map[y][x].terrain.id
      if (tid !== TERRAIN.DEEP_OCEAN.id && tid !== TERRAIN.SHALLOW_WATER.id) continue

      // Phase varies by position so adjacent tiles shimmer independently
      const phase = time * 0.0009 + x * 0.25 + y * 0.18
      const wave = Math.sin(phase) * 0.5 + 0.5  // 0–1

      if (wave > 0.5) {
        const alpha = (wave - 0.5) * 0.12
        ctx.fillStyle = tid === TERRAIN.DEEP_OCEAN.id
          ? `rgba(60,120,200,${alpha})`
          : `rgba(80,160,220,${alpha})`
        ctx.fillRect(x * cw, y * ch, cw, ch)
      }
    }
  }
}

function drawPath(ctx, map, path, w, h) {
  const cols = map[0].length
  const rows = map.length
  const cw = w / cols
  const ch = h / rows

  ctx.save()
  ctx.strokeStyle = 'rgba(249,115,22,0.28)'
  ctx.lineWidth = 9
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo((path[0].x + 0.5) * cw, (path[0].y + 0.5) * ch)
  for (let i = 1; i < path.length; i++) ctx.lineTo((path[i].x + 0.5) * cw, (path[i].y + 0.5) * ch)
  ctx.stroke()

  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo((path[0].x + 0.5) * cw, (path[0].y + 0.5) * ch)
  for (let i = 1; i < path.length; i++) ctx.lineTo((path[i].x + 0.5) * cw, (path[i].y + 0.5) * ch)
  ctx.stroke()
  ctx.restore()
}

function drawMarkers(ctx, map, points, w, h) {
  const cols = map[0].length
  const rows = map.length
  const cw = w / cols
  const ch = h / rows

  ctx.save()
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i]
    const px = (x + 0.5) * cw
    const py = (y + 0.5) * ch
    const color = i === 0 ? '#22d3ee' : '#f97316'

    ctx.beginPath()
    ctx.arc(px, py, 12, 0, Math.PI * 2)
    ctx.fillStyle = `${color}22`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(px, py, 7, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.font = 'bold 8px Inter, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(i === 0 ? 'A' : 'B', px, py)
  }
  ctx.restore()
}

// Legacy export kept for the heatmap invalidation signal
export function invalidateHeatmap() { heatmapCache = null }
export function invalidateLandmarks() { landmarkCache = null }
