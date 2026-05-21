import { TERRAIN } from './terrain.js'

// Min-heap priority queue for A*
class MinHeap {
  constructor() { this.data = [] }

  push(item) {
    this.data.push(item)
    this._bubbleUp(this.data.length - 1)
  }

  pop() {
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0) {
      this.data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  get size() { return this.data.length }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.data[parent].f <= this.data[i].f) break
      ;[this.data[parent], this.data[i]] = [this.data[i], this.data[parent]]
      i = parent
    }
  }

  _sinkDown(i) {
    const n = this.data.length
    while (true) {
      let min = i
      const l = 2 * i + 1, r = 2 * i + 2
      if (l < n && this.data[l].f < this.data[min].f) min = l
      if (r < n && this.data[r].f < this.data[min].f) min = r
      if (min === i) break
      ;[this.data[min], this.data[i]] = [this.data[i], this.data[min]]
      i = min
    }
  }
}

function heuristic(ax, ay, bx, by) {
  // Octile distance for 8-directional movement
  const dx = Math.abs(ax - bx)
  const dy = Math.abs(ay - by)
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
}

function moveCost(fromTerrain, toTerrain) {
  if (toTerrain.cost === Infinity) return Infinity
  return toTerrain.cost
}

export function findPath(map, startX, startY, endX, endY) {
  const rows = map.length
  const cols = map[0].length

  if (map[startY][startX].terrain.cost === Infinity) return null
  if (map[endY][endX].terrain.cost === Infinity) return null

  const key = (x, y) => y * cols + x
  const gScore = new Float32Array(rows * cols).fill(Infinity)
  const fScore = new Float32Array(rows * cols).fill(Infinity)
  const cameFrom = new Int32Array(rows * cols).fill(-1)

  gScore[key(startX, startY)] = 0
  fScore[key(startX, startY)] = heuristic(startX, startY, endX, endY)

  const open = new MinHeap()
  open.push({ x: startX, y: startY, f: fScore[key(startX, startY)] })

  const dirs = [
    [-1, -1, Math.SQRT2], [0, -1, 1], [1, -1, Math.SQRT2],
    [-1,  0, 1],                       [1,  0, 1],
    [-1,  1, Math.SQRT2], [0,  1, 1], [1,  1, Math.SQRT2],
  ]

  while (open.size > 0) {
    const { x, y } = open.pop()
    if (x === endX && y === endY) return reconstructPath(cameFrom, cols, endX, endY)

    for (const [dx, dy, dist] of dirs) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue

      const cost = moveCost(map[y][x].terrain, map[ny][nx].terrain)
      if (cost === Infinity) continue

      const tentG = gScore[key(x, y)] + dist * cost
      const nk = key(nx, ny)
      if (tentG < gScore[nk]) {
        cameFrom[nk] = key(x, y)
        gScore[nk] = tentG
        fScore[nk] = tentG + heuristic(nx, ny, endX, endY)
        open.push({ x: nx, y: ny, f: fScore[nk] })
      }
    }
  }

  return null
}

function reconstructPath(cameFrom, cols, endX, endY) {
  const path = []
  let k = endY * cols + endX
  while (k !== -1) {
    path.push({ x: k % cols, y: Math.floor(k / cols) })
    k = cameFrom[k]
  }
  return path.reverse()
}
