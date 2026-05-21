<template>
  <div class="flex flex-col h-screen bg-stone-950 text-stone-100 overflow-hidden">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-stone-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" class="w-4 h-4 text-white fill-none stroke-current stroke-2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>
          </svg>
        </div>
        <span class="font-display text-lg font-semibold tracking-wide text-stone-100">Atlas Engine</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Seed display -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-400 font-mono">
          <span class="text-stone-500">seed</span>
          <span class="text-amber-400">{{ seedHex }}</span>
          <button @click="copySeedLink" class="ml-1 text-stone-500 hover:text-stone-200 transition-colors" title="Copy shareable link">
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-none stroke-current stroke-2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>

        <button
          @click="generateWorld"
          :disabled="isGenerating"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 active:scale-95"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-none stroke-current stroke-2" :class="{ 'animate-spin': isGenerating }">
            <path d="M3 12a9 9 0 1018 0 9 9 0 10-18 0"/>
            <path d="M3.6 9h16.8M3.6 15h16.8"/>
          </svg>
          New World
        </button>
      </div>
    </header>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Map canvas area -->
      <div class="relative flex-1 overflow-hidden">
        <canvas
          ref="canvasRef"
          class="w-full h-full cursor-crosshair"
          :class="{ 'opacity-50': isGenerating }"
          @click="handleMapClick"
        />

        <!-- Generating overlay -->
        <Transition name="fade">
          <div v-if="isGenerating" class="absolute inset-0 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm">
            <div class="flex flex-col items-center gap-3 animate-slide-up">
              <div class="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"/>
              <p class="text-sm text-stone-400 font-medium">Shaping the world…</p>
            </div>
          </div>
        </Transition>

        <!-- Click instruction -->
        <Transition name="fade">
          <div
            v-if="!isGenerating && selectedPoints.length < 2 && !routePath"
            class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-stone-900/90 backdrop-blur-sm border border-stone-700 text-xs text-stone-400"
          >
            <span v-if="selectedPoints.length === 0">Click to place <span class="text-cyan-400 font-medium">start</span> point</span>
            <span v-else>Click to place <span class="text-orange-400 font-medium">destination</span></span>
          </div>
        </Transition>

        <!-- Copied toast -->
        <Transition name="fade">
          <div v-if="showCopied" class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-emerald-900/90 border border-emerald-600 text-xs text-emerald-300">
            Link copied to clipboard
          </div>
        </Transition>
      </div>

      <!-- Sidebar -->
      <aside class="w-64 shrink-0 border-l border-stone-800 flex flex-col overflow-y-auto bg-stone-950">
        <!-- Terrain legend -->
        <section class="p-5 border-b border-stone-800">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Terrain</h2>
          <ul class="space-y-2">
            <li v-for="t in terrainList" :key="t.id" class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-sm shrink-0" :style="{ background: t.color }"/>
              <span class="text-xs text-stone-300">{{ t.name }}</span>
              <span class="ml-auto text-xs text-stone-600 font-mono">
                {{ t.cost === Infinity ? '∞' : `×${t.cost.toFixed(1)}` }}
              </span>
            </li>
          </ul>
        </section>

        <!-- Route info -->
        <section class="p-5 border-b border-stone-800">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Route</h2>

          <div v-if="!routePath && selectedPoints.length === 0" class="text-xs text-stone-600">
            Select two points to calculate a route.
          </div>

          <div v-if="selectedPoints.length > 0" class="space-y-2">
            <div class="flex items-center gap-2 text-xs">
              <span class="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-[10px]">A</span>
              <span class="text-stone-300 font-mono">{{ selectedPoints[0].x }}, {{ selectedPoints[0].y }}</span>
            </div>
            <div v-if="selectedPoints.length > 1" class="flex items-center gap-2 text-xs">
              <span class="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-[10px]">B</span>
              <span class="text-stone-300 font-mono">{{ selectedPoints[1].x }}, {{ selectedPoints[1].y }}</span>
            </div>
          </div>

          <Transition name="fade">
            <div v-if="routeInfo" class="mt-4 space-y-2.5 animate-slide-up">
              <div class="rounded-lg bg-stone-900 border border-stone-800 p-3 space-y-2">
                <div class="flex justify-between text-xs">
                  <span class="text-stone-500">Steps</span>
                  <span class="text-stone-200 font-mono">{{ routeInfo.steps }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-stone-500">Travel cost</span>
                  <span class="text-amber-400 font-mono">{{ routeInfo.cost.toFixed(1) }}</span>
                </div>
              </div>
              <div v-if="routeInfo.breakdown.length > 0" class="space-y-1">
                <p class="text-xs text-stone-600 mb-1.5">Terrain breakdown</p>
                <div v-for="b in routeInfo.breakdown" :key="b.name" class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-sm" :style="{ background: b.color }"/>
                  <span class="text-xs text-stone-400">{{ b.name }}</span>
                  <span class="ml-auto text-xs text-stone-600 font-mono">{{ b.steps }}px</span>
                </div>
              </div>
            </div>
          </Transition>

          <div v-if="noPathFound" class="mt-3 text-xs text-red-400">
            No path found — destination may be unreachable.
          </div>

          <button
            v-if="selectedPoints.length > 0"
            @click="clearRoute"
            class="mt-4 w-full text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            Clear route
          </button>
        </section>

        <!-- Overlays -->
        <section class="p-5 border-b border-stone-800">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Overlays</h2>
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" v-model="showHeatmap" @change="redraw" class="w-3.5 h-3.5 accent-amber-500"/>
            <span class="text-xs text-stone-300">Cost heatmap</span>
          </label>
          <label class="flex items-center gap-2.5 cursor-pointer mt-2">
            <input type="checkbox" v-model="showLandmarks" @change="redraw" class="w-3.5 h-3.5 accent-emerald-500"/>
            <span class="text-xs text-stone-300">Landmarks</span>
          </label>
        </section>

        <!-- Landmarks list -->
        <Transition name="fade">
          <section v-if="showLandmarks && landmarks.length > 0" class="p-5">
            <h2 class="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Discovered Places</h2>
            <ul class="space-y-1.5">
              <li v-for="lm in landmarks" :key="lm.name" class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: lm.terrain.color }"/>
                <span class="text-xs text-stone-400">{{ lm.name }}</span>
              </li>
            </ul>
          </section>
        </Transition>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { generateHeightmap, TERRAIN } from '../engine/terrain.js'
import { findPath } from '../engine/pathfinder.js'
import { generateLandmarks } from '../engine/landmarks.js'
import { randomSeed, seedFromString } from '../engine/rng.js'
import { renderMap, renderHeatmap, renderLandmarks, renderMarkers } from '../engine/renderer.js'

const router = useRouter()
const route = useRoute()

const MAP_COLS = 200
const MAP_ROWS = 140

const canvasRef = ref(null)
const isGenerating = ref(false)
const showHeatmap = ref(false)
const showLandmarks = ref(true)
const showCopied = ref(false)
const selectedPoints = ref([])
const routePath = ref(null)
const routeInfo = ref(null)
const noPathFound = ref(false)
const landmarks = ref([])

let map = null
let currentSeed = 0
let animationFrameId = null

const terrainList = Object.values(TERRAIN)

const seedHex = computed(() => currentSeed.toString(16).padStart(8, '0').toUpperCase())

// ── World generation ──────────────────────────────────────────────────────────

async function generateWorld(seed) {
  isGenerating.value = true
  clearRoute()
  await nextTick()

  // Run heavy work after paint
  await new Promise(resolve => setTimeout(resolve, 30))

  currentSeed = seed !== undefined ? seed : randomSeed()
  map = generateHeightmap(MAP_COLS, MAP_ROWS, currentSeed)
  landmarks.value = generateLandmarks(map, currentSeed)

  router.replace({ query: { seed: currentSeed.toString(16) } })

  await nextTick()
  resizeCanvas()
  redraw()

  isGenerating.value = false
}

// ── Canvas rendering ──────────────────────────────────────────────────────────

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
}

function redraw() {
  if (!map || !canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  renderMap(canvas, map)
  if (showHeatmap.value) renderHeatmap(canvas, map)
  if (showLandmarks.value) renderLandmarks(canvas, map, landmarks.value)
  renderMarkers(canvas, map, selectedPoints.value)

  if (routePath.value?.length) {
    drawFullPath(canvas, routePath.value)
  }
}

// ── Path animation ────────────────────────────────────────────────────────────

function drawFullPath(canvas, path) {
  if (!path.length) return
  const ctx = canvas.getContext('2d')
  const rows = map.length
  const cols = map[0].length
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  ctx.save()
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.shadowColor = '#f97316'
  ctx.shadowBlur = 6

  ctx.beginPath()
  ctx.moveTo((path[0].x + 0.5) * cellW, (path[0].y + 0.5) * cellH)
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo((path[i].x + 0.5) * cellW, (path[i].y + 0.5) * cellH)
  }
  ctx.stroke()
  ctx.restore()
}

function animatePath(canvas, path) {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)

  const totalPoints = path.length
  let drawn = 0
  const speed = Math.max(1, Math.floor(totalPoints / 120))

  function frame() {
    drawn = Math.min(drawn + speed, totalPoints)
    redrawWithPartialPath(canvas, path.slice(0, drawn))
    if (drawn < totalPoints) {
      animationFrameId = requestAnimationFrame(frame)
    }
  }
  animationFrameId = requestAnimationFrame(frame)
}

function redrawWithPartialPath(canvas, partial) {
  if (!map) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  renderMap(canvas, map)
  if (showHeatmap.value) renderHeatmap(canvas, map)
  if (showLandmarks.value) renderLandmarks(canvas, map, landmarks.value)
  renderMarkers(canvas, map, selectedPoints.value)

  if (partial.length > 1) {
    drawFullPath(canvas, partial)
  }
}

// ── Map interaction ───────────────────────────────────────────────────────────

function handleMapClick(e) {
  if (!map || isGenerating.value) return

  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  const mx = Math.floor((px / canvas.width) * MAP_COLS)
  const my = Math.floor((py / canvas.height) * MAP_ROWS)

  if (mx < 0 || my < 0 || mx >= MAP_COLS || my >= MAP_ROWS) return

  if (selectedPoints.value.length === 2) {
    clearRoute()
    return
  }

  selectedPoints.value = [...selectedPoints.value, { x: mx, y: my }]
  noPathFound.value = false

  if (selectedPoints.value.length === 2) {
    calculateRoute()
  } else {
    redraw()
  }
}

function calculateRoute() {
  const [a, b] = selectedPoints.value
  const path = findPath(map, a.x, a.y, b.x, b.y)

  if (!path) {
    noPathFound.value = true
    redraw()
    return
  }

  routePath.value = path

  // Build route info
  const breakdown = {}
  let totalCost = 0
  for (const { x, y } of path) {
    const t = map[y][x].terrain
    totalCost += t.cost === Infinity ? 0 : t.cost
    if (!breakdown[t.id]) breakdown[t.id] = { name: t.name, color: t.color, steps: 0 }
    breakdown[t.id].steps++
  }

  routeInfo.value = {
    steps: path.length,
    cost: totalCost,
    breakdown: Object.values(breakdown).sort((a, b) => b.steps - a.steps),
  }

  animatePath(canvasRef.value, path)
}

function clearRoute() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  selectedPoints.value = []
  routePath.value = null
  routeInfo.value = null
  noPathFound.value = false
  redraw()
}

// ── Seed sharing ──────────────────────────────────────────────────────────────

async function copySeedLink() {
  const url = window.location.href
  await navigator.clipboard.writeText(url)
  showCopied.value = true
  setTimeout(() => (showCopied.value = false), 2000)
}

// ── Resize ────────────────────────────────────────────────────────────────────

function onResize() {
  resizeCanvas()
  redraw()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await nextTick()
  resizeCanvas()

  const querySeed = route.query.seed
  const seed = querySeed ? parseInt(querySeed, 16) : randomSeed()
  await generateWorld(seed)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
