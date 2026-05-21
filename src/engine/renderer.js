import { TERRAIN } from './terrain.js'

// Slightly varied color per height within each terrain band for visual depth
function terrainColor(cell) {
  const t = cell.terrain
  const h = cell.height

  switch (t.id) {
    case TERRAIN.DEEP_OCEAN.id: {
      const v = Math.floor(20 + h * 30)
      return `rgb(${v}, ${v + 30}, ${v + 80})`
    }
    case TERRAIN.SHALLOW_WATER.id: {
      const v = Math.floor(50 + h * 50)
      return `rgb(${v}, ${v + 60}, ${Math.min(255, v + 130)})`
    }
    case TERRAIN.SHORE.id: {
      const v = Math.floor(180 + h * 30)
      return `rgb(${v}, ${Math.floor(v * 0.85)}, ${Math.floor(v * 0.55)})`
    }
    case TERRAIN.PLAINS.id: {
      const g = Math.floor(120 + h * 80)
      return `rgb(${Math.floor(g * 0.65)}, ${g}, ${Math.floor(g * 0.45)})`
    }
    case TERRAIN.FOREST.id: {
      const g = Math.floor(60 + h * 60)
      return `rgb(${Math.floor(g * 0.4)}, ${g}, ${Math.floor(g * 0.3)})`
    }
    case TERRAIN.MOUNTAIN.id: {
      const v = Math.floor(80 + h * 80)
      return `rgb(${v}, ${Math.floor(v * 0.88)}, ${Math.floor(v * 0.78)})`
    }
    case TERRAIN.SNOW.id: {
      const v = Math.floor(200 + h * 55)
      return `rgb(${v}, ${v}, ${Math.min(255, v + 10)})`
    }
    default:
      return t.color
  }
}

export function renderMap(canvas, map) {
  const rows = map.length
  const cols = map[0].length
  const ctx = canvas.getContext('2d')

  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const data = imageData.data

  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const mx = Math.min(cols - 1, Math.floor(px / cellW))
      const my = Math.min(rows - 1, Math.floor(py / cellH))
      const cell = map[my][mx]

      // Parse the rgb string
      const color = terrainColor(cell)
      const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      const i = (py * canvas.width + px) * 4
      data[i]     = parseInt(m[1])
      data[i + 1] = parseInt(m[2])
      data[i + 2] = parseInt(m[3])
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

export function renderHeatmap(canvas, map, pathCosts) {
  if (!pathCosts) return
  const ctx = canvas.getContext('2d')
  const rows = map.length
  const cols = map[0].length
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  const maxCost = 6.0

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cost = map[y][x].terrain.cost
      if (cost === Infinity) continue
      const t = Math.min(1, (cost - 1) / (maxCost - 1))
      const r = Math.floor(t * 255)
      const g = Math.floor((1 - t) * 180)
      ctx.fillStyle = `rgba(${r}, ${g}, 20, 0.35)`
      ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.ceil(cellW), Math.ceil(cellH))
    }
  }
}

export function renderLandmarks(canvas, map, landmarks) {
  const ctx = canvas.getContext('2d')
  const rows = map.length
  const cols = map[0].length
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  ctx.save()
  ctx.font = '600 10px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  for (const lm of landmarks) {
    const px = (lm.x + 0.5) * cellW
    const py = (lm.y + 0.5) * cellH

    // Dot
    ctx.beginPath()
    ctx.arc(px, py, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Label shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillText(lm.name, px + 1, py - 6)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fillText(lm.name, px, py - 7)
  }

  ctx.restore()
}

export function renderMarkers(canvas, map, points) {
  const ctx = canvas.getContext('2d')
  const rows = map.length
  const cols = map[0].length
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  ctx.save()
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i]
    const px = (x + 0.5) * cellW
    const py = (y + 0.5) * cellH
    const color = i === 0 ? '#22d3ee' : '#f97316'

    ctx.beginPath()
    ctx.arc(px, py, 8, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = 'bold 10px Inter, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(i === 0 ? 'A' : 'B', px, py)
  }
  ctx.restore()
}
