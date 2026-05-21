import { TERRAIN } from './terrain.js'

function terrainColor(cell) {
  const { terrain: t, height: h, moisture: m = 0.5, temperature: temp = 0.5 } = cell

  switch (t.id) {
    case TERRAIN.DEEP_OCEAN.id: {
      const v = Math.floor(12 + h * 35)
      return [v + 3, v + 28, v + 80]
    }
    case TERRAIN.SHALLOW_WATER.id: {
      // Warmer water = more teal; colder = darker blue
      const warmth = temp * 30
      const v = Math.floor(40 + h * 50)
      return [v, Math.floor(v + 55 + warmth), Math.min(255, v + 120)]
    }
    case TERRAIN.SHORE.id: {
      // Wet shore = darker sand; dry = pale sand
      const dryness = 1 - m
      const r = Math.floor(160 + dryness * 50 + h * 20)
      return [r, Math.floor(r * 0.82 + dryness * 10), Math.floor(r * 0.5)]
    }
    case TERRAIN.PLAINS.id: {
      // Hot+dry = savanna yellow; cool+wet = lush green; temperate = mid green
      if (temp > 0.65 && m < 0.45) {
        // Savanna
        const v = Math.floor(140 + h * 40)
        return [v, Math.floor(v * 0.85), Math.floor(v * 0.25)]
      }
      if (temp < 0.3) {
        // Tundra
        const v = Math.floor(100 + h * 50)
        return [Math.floor(v * 0.8), Math.floor(v * 0.85), Math.floor(v * 0.65)]
      }
      // Standard plains — moisture shifts green/yellow
      const g = Math.floor(95 + m * 70 + h * 50)
      return [Math.floor(g * (0.65 - m * 0.2)), g, Math.floor(g * (0.3 + m * 0.1))]
    }
    case TERRAIN.FOREST.id: {
      if (temp > 0.6 && m > 0.65) {
        // Tropical — deep lush green
        const g = Math.floor(70 + h * 55)
        return [Math.floor(g * 0.28), Math.floor(g * 1.1), Math.floor(g * 0.35)]
      }
      if (temp < 0.3) {
        // Boreal / taiga — dark blue-green
        const g = Math.floor(45 + h * 55)
        return [Math.floor(g * 0.3), Math.floor(g * 0.85), Math.floor(g * 0.6)]
      }
      // Temperate forest
      const g = Math.floor(55 + m * 40 + h * 40)
      return [Math.floor(g * 0.35), g, Math.floor(g * 0.28)]
    }
    case TERRAIN.MOUNTAIN.id: {
      // Cold mountains more purple-grey; dry more reddish
      const warm = temp * 20
      const v = Math.floor(72 + h * 85)
      return [v + Math.floor(warm), Math.floor(v * 0.86), Math.floor(v * 0.76 - warm * 0.5)]
    }
    case TERRAIN.SNOW.id: {
      // Pure peaks — slight blue tint
      const v = Math.floor(200 + h * 55)
      return [v, v, Math.min(255, v + 15)]
    }
    default:
      return [120, 120, 120]
  }
}

function logicalSize(canvas) {
  return {
    w: canvas._logicalW || canvas.width,
    h: canvas._logicalH || canvas.height,
  }
}

export function renderMap(canvas, map) {
  const rows = map.length
  const cols = map[0].length
  const ctx = canvas.getContext('2d')
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

    // Label pill
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

    // Outer ring
    ctx.beginPath()
    ctx.arc(px, py, 12, 0, Math.PI * 2)
    ctx.fillStyle = `${color}22`
    ctx.fill()

    // Main dot
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
