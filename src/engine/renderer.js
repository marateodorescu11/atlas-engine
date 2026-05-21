import { TERRAIN } from './terrain.js'

// ── Color helpers ─────────────────────────────────────────────────────────────

function terrainRGB(cell, time = 0) {
  const { terrain: t, height: h, moisture: m = 0.5, temperature: temp = 0.5 } = cell

  switch (t.id) {
    case TERRAIN.DEEP_OCEAN.id: {
      const wave = Math.sin(time * 0.0008 + h * 12) * 6
      const v = Math.floor(12 + h * 35 + wave)
      return [v + 3, v + 28, Math.min(255, v + 82)]
    }
    case TERRAIN.SHALLOW_WATER.id: {
      const wave = Math.sin(time * 0.001 + h * 8) * 5
      const warmth = temp * 28
      const v = Math.floor(40 + h * 50 + wave)
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

// Bilinear interpolate between two RGB triples
function lerpRGB(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function bilinearCell(map, fx, fy, rows, cols, time) {
  const x0 = Math.max(0, Math.min(cols - 1, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(rows - 1, Math.floor(fy)))
  const x1 = Math.min(cols - 1, x0 + 1)
  const y1 = Math.min(rows - 1, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0

  const c00 = terrainRGB(map[y0][x0], time)
  const c10 = terrainRGB(map[y0][x1], time)
  const c01 = terrainRGB(map[y1][x0], time)
  const c11 = terrainRGB(map[y1][x1], time)

  const top = lerpRGB(c00, c10, tx)
  const bot = lerpRGB(c01, c11, tx)
  return lerpRGB(top, bot, ty)
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function logicalSize(canvas) {
  return {
    w: canvas._logicalW || canvas.width,
    h: canvas._logicalH || canvas.height,
  }
}

// ── Public render functions ───────────────────────────────────────────────────

/**
 * Render the terrain map to the canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} map
 * @param {number} time  - milliseconds, used for water animation
 */
export function renderMap(canvas, map, time = 0) {
  const rows = map.length
  const cols = map[0].length
  const ctx = canvas.getContext('2d')
  const pw = canvas.width
  const ph = canvas.height
  const imageData = ctx.createImageData(pw, ph)
  const data = imageData.data

  // Only water tiles need bilinear blending — others use fast nearest-neighbor
  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      const fx = (px / pw) * cols
      const fy = (py / ph) * rows
      const mx = Math.min(cols - 1, Math.floor(fx))
      const my = Math.min(rows - 1, Math.floor(fy))
      const cell = map[my][mx]
      const tid = cell.terrain.id

      let r, g, b
      if (
        tid === TERRAIN.DEEP_OCEAN.id ||
        tid === TERRAIN.SHALLOW_WATER.id ||
        tid === TERRAIN.SHORE.id
      ) {
        // Bilinear for smooth coastlines + animated water
        ;[r, g, b] = bilinearCell(map, fx, fy, rows, cols, time)
      } else {
        ;[r, g, b] = terrainRGB(cell, time)
      }

      const i = (py * pw + px) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
    }
  }

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.putImageData(imageData, 0, 0)
  ctx.restore()
}

export function renderHeatmap(canvas, map) {
  const rows = map.length
  const cols = map[0].length
  const { w, h } = logicalSize(canvas)
  const ctx = canvas.getContext('2d')
  const cw = w / cols
  const ch = h / rows
  const maxCost = 6.0

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

export function renderLandmarks(canvas, map, landmarks) {
  const rows = map.length
  const cols = map[0].length
  const { w, h } = logicalSize(canvas)
  const ctx = canvas.getContext('2d')
  const cw = w / cols
  const ch = h / rows

  ctx.save()
  for (const lm of landmarks) {
    const px = (lm.x + 0.5) * cw
    const py = (lm.y + 0.5) * ch

    ctx.save()
    ctx.translate(px, py - 2)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(-3, -3, 6, 6)
    ctx.restore()

    ctx.font = '500 9.5px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const metrics = ctx.measureText(lm.name)
    const lw = metrics.width + 8
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
  ctx.restore()
}

export function renderMarkers(canvas, map, points) {
  if (!points.length) return
  const rows = map.length
  const cols = map[0].length
  const { w, h } = logicalSize(canvas)
  const ctx = canvas.getContext('2d')
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

export function renderPath(canvas, map, path) {
  if (!path?.length || !map) return
  const rows = map.length
  const cols = map[0].length
  const { w, h } = logicalSize(canvas)
  const ctx = canvas.getContext('2d')
  const cw = w / cols
  const ch = h / rows

  ctx.save()
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.28)'
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
