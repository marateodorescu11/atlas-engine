import { TERRAIN } from './terrain.js'

function terrainColor(cell) {
  const t = cell.terrain
  const h = cell.height

  switch (t.id) {
    case TERRAIN.DEEP_OCEAN.id: {
      const v = Math.floor(15 + h * 40)
      return [v + 5, v + 35, v + 85]
    }
    case TERRAIN.SHALLOW_WATER.id: {
      const v = Math.floor(45 + h * 55)
      return [v, v + 65, Math.min(255, v + 135)]
    }
    case TERRAIN.SHORE.id: {
      const v = Math.floor(170 + h * 40)
      return [v, Math.floor(v * 0.83), Math.floor(v * 0.52)]
    }
    case TERRAIN.PLAINS.id: {
      const g = Math.floor(100 + h * 90)
      return [Math.floor(g * 0.55), g, Math.floor(g * 0.38)]
    }
    case TERRAIN.FOREST.id: {
      const g = Math.floor(55 + h * 65)
      return [Math.floor(g * 0.35), g, Math.floor(g * 0.28)]
    }
    case TERRAIN.MOUNTAIN.id: {
      const v = Math.floor(75 + h * 90)
      return [v, Math.floor(v * 0.87), Math.floor(v * 0.76)]
    }
    case TERRAIN.SNOW.id: {
      const v = Math.floor(195 + h * 60)
      return [v, v, Math.min(255, v + 12)]
    }
    default:
      return [120, 120, 120]
  }
}

// Returns logical width/height of canvas (accounting for DPR scaling)
function logicalSize(canvas) {
  return {
    w: canvas._logicalW || canvas.width,
    h: canvas._logicalH || canvas.height,
  }
}

export function renderMap(canvas, map) {
  const rows = map.length
  const cols = map[0].length
  const { w, h } = logicalSize(canvas)
  const ctx = canvas.getContext('2d')

  // Render at native pixel resolution for sharpness
  const pw = canvas.width
  const ph = canvas.height
  const imageData = ctx.createImageData(pw, ph)
  const data = imageData.data

  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      const mx = Math.min(cols - 1, Math.floor((px / pw) * cols))
      const my = Math.min(rows - 1, Math.floor((py / ph) * rows))
      const [r, g, b] = terrainColor(map[my][mx])
      const i = (py * pw + px) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
    }
  }

  // Save/restore transform so we don't fight the DPR scale
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

    // Diamond marker
    ctx.save()
    ctx.translate(px, py - 2)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(-3, -3, 6, 6)
    ctx.restore()

    // Label
    ctx.font = '500 9.5px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const metrics = ctx.measureText(lm.name)
    const lw = metrics.width + 8
    const lh = 14
    const lx = px - lw / 2
    const ly = py - 14

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    ctx.roundRect(lx, ly, lw, lh, 2)
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

    // Outer ring pulse
    ctx.beginPath()
    ctx.arc(px, py, 12, 0, Math.PI * 2)
    ctx.fillStyle = `${color}22`
    ctx.fill()

    // Main dot
    ctx.beginPath()
    ctx.arc(px, py, 7, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Label
    ctx.font = 'bold 8px Inter, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(i === 0 ? 'A' : 'B', px, py)
  }
  ctx.restore()
}
