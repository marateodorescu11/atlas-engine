<template>
  <div class="flex flex-col h-screen bg-[#080808] text-stone-100 overflow-hidden select-none">

    <!-- Header bar -->
    <header class="relative z-10 flex items-center justify-between px-6 h-14 border-b border-white/5 bg-[#0e0e0e] shrink-0">
      <div class="flex items-center gap-3">
        <GlobeIcon class="w-7 h-7 text-emerald-500" />
        <div>
          <span class="font-display text-base font-semibold tracking-widest text-stone-100">ATLAS ENGINE</span>
          <span class="ml-3 text-[10px] text-stone-600 tracking-widest uppercase">Procedural World Generator</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Seed pill -->
        <div class="flex items-center gap-2 h-8 px-3 rounded-md bg-white/5 border border-white/8 text-xs font-mono">
          <span class="text-stone-600">seed</span>
          <span class="text-amber-400 tracking-wider">{{ seedHex }}</span>
          <button
            @click="copySeedLink"
            class="text-stone-600 hover:text-stone-300 transition-colors ml-0.5"
            title="Copy shareable link"
          >
            <CopyIcon class="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          @click="generateWorld()"
          :disabled="isGenerating"
          class="flex items-center gap-1.5 h-8 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all duration-100 active:scale-[0.98]"
        >
          <RefreshIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': isGenerating }" />
          New World
        </button>
      </div>
    </header>

    <!-- Body -->
    <div class="flex flex-1 overflow-hidden">

      <!-- ── Canvas ── -->
      <div class="relative flex-1 overflow-hidden bg-[#080808]">
        <canvas
          ref="canvasRef"
          class="absolute inset-0 w-full h-full"
          :class="[
            isGenerating ? 'opacity-30 cursor-wait' : 'cursor-crosshair',
            'transition-opacity duration-300'
          ]"
          @click="handleMapClick"
        />

        <!-- Vignette overlay -->
        <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" />

        <!-- Generating overlay -->
        <Transition name="fade">
          <div v-if="isGenerating" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="flex flex-col items-center gap-4 animate-slide-up">
              <div class="relative">
                <div class="w-12 h-12 rounded-full border border-emerald-900 border-t-emerald-500 animate-spin" />
                <div class="absolute inset-0 flex items-center justify-center">
                  <GlobeIcon class="w-5 h-5 text-emerald-700" />
                </div>
              </div>
              <div class="text-center">
                <p class="text-sm text-stone-300 font-medium">Shaping the world</p>
                <p class="text-xs text-stone-600 mt-0.5 font-mono">{{ seedHex }}</p>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Instruction banner -->
        <Transition name="slide-bottom">
          <div
            v-if="!isGenerating && selectedPoints.length < 2 && !routePath"
            class="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-stone-400 pointer-events-none"
          >
            <span v-if="selectedPoints.length === 0">
              Click to set <span class="text-cyan-400 font-semibold">origin</span>
            </span>
            <span v-else>
              Click to set <span class="text-orange-400 font-semibold">destination</span>
            </span>
          </div>
        </Transition>

        <!-- Copied toast -->
        <Transition name="fade">
          <div
            v-if="showCopied"
            class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-4 rounded-full bg-emerald-950/90 border border-emerald-800 text-xs text-emerald-400 backdrop-blur-sm"
          >
            <CheckIcon class="w-3.5 h-3.5" /> Link copied
          </div>
        </Transition>

        <!-- No path found -->
        <Transition name="fade">
          <div
            v-if="noPathFound"
            class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-4 rounded-full bg-red-950/90 border border-red-900 text-xs text-red-400 backdrop-blur-sm"
          >
            No route found — destination unreachable
          </div>
        </Transition>
      </div>

      <!-- ── Sidebar ── -->
      <aside class="w-60 shrink-0 border-l border-white/5 bg-[#0e0e0e] flex flex-col overflow-y-auto">

        <!-- Terrain legend -->
        <Section title="Terrain">
          <ul class="space-y-1.5">
            <li
              v-for="t in terrainList"
              :key="t.id"
              class="flex items-center gap-2.5 group"
            >
              <span class="w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-white/10" :style="{ background: t.color }" />
              <span class="text-xs text-stone-400 group-hover:text-stone-200 transition-colors">{{ t.name }}</span>
              <span class="ml-auto text-[10px] text-stone-700 font-mono tabular-nums">
                {{ t.cost === Infinity ? '—' : `×${t.cost.toFixed(1)}` }}
              </span>
            </li>
          </ul>
        </Section>

        <!-- Route info -->
        <Section title="Route">
          <div v-if="!routePath && selectedPoints.length === 0" class="text-xs text-stone-700">
            Select two points on the map.
          </div>

          <div v-if="selectedPoints.length > 0" class="space-y-2">
            <WaypointRow label="A" color="cyan" :point="selectedPoints[0]" />
            <WaypointRow v-if="selectedPoints.length > 1" label="B" color="orange" :point="selectedPoints[1]" />
          </div>

          <Transition name="fade">
            <div v-if="routeInfo" class="mt-3 space-y-3 animate-fade-in">
              <!-- Stats -->
              <div class="grid grid-cols-2 gap-2">
                <StatCard label="Steps" :value="routeInfo.steps.toLocaleString()" />
                <StatCard label="Cost" :value="routeInfo.cost.toFixed(1)" accent />
              </div>

              <!-- Terrain breakdown bar -->
              <div v-if="routeInfo.breakdown.length > 0">
                <p class="text-[10px] text-stone-700 uppercase tracking-widest mb-1.5">Via</p>
                <div class="flex rounded overflow-hidden h-2 gap-px">
                  <div
                    v-for="b in routeInfo.breakdown"
                    :key="b.name"
                    :style="{ background: b.color, flex: b.steps }"
                    :title="`${b.name}: ${b.steps} steps`"
                  />
                </div>
                <ul class="mt-2 space-y-1">
                  <li v-for="b in routeInfo.breakdown" :key="b.name" class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-sm shrink-0" :style="{ background: b.color }" />
                    <span class="text-[11px] text-stone-500">{{ b.name }}</span>
                    <span class="ml-auto text-[10px] text-stone-700 font-mono">{{ b.steps }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Transition>

          <button
            v-if="selectedPoints.length > 0"
            @click="clearRoute"
            class="mt-4 w-full text-[11px] text-stone-700 hover:text-stone-400 transition-colors text-center"
          >
            Clear route
          </button>
        </Section>

        <!-- Overlays -->
        <Section title="Overlays">
          <ToggleRow v-model="showHeatmap" label="Cost heatmap" color="amber" @change="redraw" />
          <ToggleRow v-model="showLandmarks" label="Landmarks" color="emerald" @change="redraw" class="mt-2" />
        </Section>

        <!-- Landmarks -->
        <Transition name="fade">
          <Section v-if="showLandmarks && landmarks.length > 0" title="Discovered Places">
            <ul class="space-y-1.5">
              <li
                v-for="lm in landmarks"
                :key="lm.name"
                class="flex items-center gap-2"
              >
                <span class="w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-white/10" :style="{ background: lm.terrain.color }" />
                <span class="text-[11px] text-stone-500 truncate">{{ lm.name }}</span>
              </li>
            </ul>
          </Section>
        </Transition>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, defineComponent, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { generateHeightmap, TERRAIN } from '../engine/terrain.js'
import { findPath } from '../engine/pathfinder.js'
import { generateLandmarks } from '../engine/landmarks.js'
import { randomSeed } from '../engine/rng.js'
import { renderMap, renderHeatmap, renderLandmarks, renderMarkers } from '../engine/renderer.js'

// ── Inline micro-components ───────────────────────────────────────────────────

const GlobeIcon = defineComponent({
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'inline-block' }, [
    h('circle', { cx: '12', cy: '12', r: '10' }),
    h('path', { d: 'M2 12h20' }),
    h('path', { d: 'M12 2a15.3 15.3 0 010 20' }),
    h('path', { d: 'M12 2a15.3 15.3 0 000 20' }),
  ])
})

const RefreshIcon = defineComponent({
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [
    h('path', { d: 'M3 12a9 9 0 0114-7.4L21 8M3 12l4-4' }),
    h('path', { d: 'M21 12a9 9 0 01-14 7.4L3 16m18-4l-4 4' }),
  ])
})

const CopyIcon = defineComponent({
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [
    h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2' }),
    h('path', { d: 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' }),
  ])
})

const CheckIcon = defineComponent({
  render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', class: 'inline-block' }, [
    h('path', { d: 'M5 13l4 4L19 7' }),
  ])
})

const Section = defineComponent({
  props: ['title'],
  setup(props, { slots }) {
    return () => h('section', { class: 'px-4 py-4 border-b border-white/5' }, [
      h('h2', { class: 'text-[9px] font-semibold uppercase tracking-[0.15em] text-stone-700 mb-3' }, props.title),
      slots.default?.(),
    ])
  },
})

const WaypointRow = defineComponent({
  props: ['label', 'color', 'point'],
  setup(props) {
    const colorMap = { cyan: 'bg-cyan-500', orange: 'bg-orange-500' }
    return () => h('div', { class: 'flex items-center gap-2 text-xs' }, [
      h('span', { class: `w-5 h-5 rounded-full ${colorMap[props.color]} flex items-center justify-center text-white font-bold text-[9px]` }, props.label),
      h('span', { class: 'text-stone-500 font-mono text-[11px]' }, `${props.point.x}, ${props.point.y}`),
    ])
  },
})

const StatCard = defineComponent({
  props: ['label', 'value', 'accent'],
  setup(props) {
    return () => h('div', { class: 'rounded bg-white/5 border border-white/5 p-2.5' }, [
      h('p', { class: 'text-[9px] text-stone-700 uppercase tracking-widest' }, props.label),
      h('p', { class: `text-sm font-semibold font-mono mt-0.5 ${props.accent ? 'text-amber-400' : 'text-stone-200'}` }, props.value),
    ])
  },
})

const ToggleRow = defineComponent({
  props: ['modelValue', 'label', 'color'],
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const colorMap = { amber: 'accent-amber-500', emerald: 'accent-emerald-500' }
    return () => h('label', { class: 'flex items-center gap-2.5 cursor-pointer' }, [
      h('input', {
        type: 'checkbox',
        checked: props.modelValue,
        class: `w-3 h-3 ${colorMap[props.color]}`,
        onChange: (e) => { emit('update:modelValue', e.target.checked); emit('change') },
      }),
      h('span', { class: 'text-xs text-stone-400' }, props.label),
    ])
  },
})

// ── State ─────────────────────────────────────────────────────────────────────

const router = useRouter()
const route = useRoute()

const MAP_COLS = 220
const MAP_ROWS = 150

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
let animFrameId = null

const terrainList = Object.values(TERRAIN)
const seedHex = computed(() => currentSeed.toString(16).padStart(8, '0').toUpperCase())

// ── Generation ────────────────────────────────────────────────────────────────

async function generateWorld(seed) {
  isGenerating.value = true
  clearRoute()
  await nextTick()
  await new Promise(r => setTimeout(r, 50))

  currentSeed = seed !== undefined ? seed : randomSeed()
  map = generateHeightmap(MAP_COLS, MAP_ROWS, currentSeed)
  landmarks.value = generateLandmarks(map, currentSeed)

  router.replace({ query: { seed: currentSeed.toString(16) } })

  await nextTick()
  resizeCanvas()
  renderFull()

  isGenerating.value = false
}

// ── Canvas ────────────────────────────────────────────────────────────────────

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  canvas._logicalW = rect.width
  canvas._logicalH = rect.height
}

function renderFull() {
  if (!map || !canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const w = canvas._logicalW || canvas.width
  const h = canvas._logicalH || canvas.height
  ctx.clearRect(0, 0, w, h)
  renderMap(canvas, map)
  if (showHeatmap.value) renderHeatmap(canvas, map)
  if (showLandmarks.value) renderLandmarks(canvas, map, landmarks.value)
  renderMarkers(canvas, map, selectedPoints.value)
  if (routePath.value?.length) drawPath(canvas, routePath.value)
}

function redraw() {
  renderFull()
}

// ── Path drawing ──────────────────────────────────────────────────────────────

function drawPath(canvas, path) {
  if (!path?.length || !map) return
  const ctx = canvas.getContext('2d')
  const w = canvas._logicalW || canvas.width
  const h = canvas._logicalH || canvas.height
  const cw = w / MAP_COLS
  const ch = h / MAP_ROWS

  ctx.save()
  // Glow pass
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.3)'
  ctx.lineWidth = 8
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo((path[0].x + 0.5) * cw, (path[0].y + 0.5) * ch)
  for (let i = 1; i < path.length; i++) ctx.lineTo((path[i].x + 0.5) * cw, (path[i].y + 0.5) * ch)
  ctx.stroke()

  // Main line
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo((path[0].x + 0.5) * cw, (path[0].y + 0.5) * ch)
  for (let i = 1; i < path.length; i++) ctx.lineTo((path[i].x + 0.5) * cw, (path[i].y + 0.5) * ch)
  ctx.stroke()
  ctx.restore()
}

function animatePath(canvas, path) {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  const total = path.length
  let drawn = 0
  const speed = Math.max(2, Math.floor(total / 90))

  function frame() {
    drawn = Math.min(drawn + speed, total)
    const partial = path.slice(0, drawn)
    if (!map) return

    const ctx = canvas.getContext('2d')
    const w = canvas._logicalW || canvas.width
    const h = canvas._logicalH || canvas.height
    ctx.clearRect(0, 0, w, h)
    renderMap(canvas, map)
    if (showHeatmap.value) renderHeatmap(canvas, map)
    if (showLandmarks.value) renderLandmarks(canvas, map, landmarks.value)
    renderMarkers(canvas, map, selectedPoints.value)
    drawPath(canvas, partial)

    if (drawn < total) animFrameId = requestAnimationFrame(frame)
  }
  animFrameId = requestAnimationFrame(frame)
}

// ── Interaction ───────────────────────────────────────────────────────────────

function handleMapClick(e) {
  if (!map || isGenerating.value) return
  if (selectedPoints.value.length === 2) { clearRoute(); return }

  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const mx = Math.floor(((e.clientX - rect.left) / rect.width) * MAP_COLS)
  const my = Math.floor(((e.clientY - rect.top) / rect.height) * MAP_ROWS)
  if (mx < 0 || my < 0 || mx >= MAP_COLS || my >= MAP_ROWS) return

  selectedPoints.value = [...selectedPoints.value, { x: mx, y: my }]
  noPathFound.value = false

  if (selectedPoints.value.length === 2) {
    calculateRoute()
  } else {
    renderFull()
  }
}

function calculateRoute() {
  const [a, b] = selectedPoints.value
  const path = findPath(map, a.x, a.y, b.x, b.y)
  if (!path) { noPathFound.value = true; renderFull(); return }

  routePath.value = path
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
  if (animFrameId) cancelAnimationFrame(animFrameId)
  selectedPoints.value = []
  routePath.value = null
  routeInfo.value = null
  noPathFound.value = false
  renderFull()
}

// ── Seed sharing ──────────────────────────────────────────────────────────────

async function copySeedLink() {
  await navigator.clipboard.writeText(window.location.href)
  showCopied.value = true
  setTimeout(() => (showCopied.value = false), 2000)
}

// ── Resize ────────────────────────────────────────────────────────────────────

function onResize() { resizeCanvas(); renderFull() }

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await nextTick()
  resizeCanvas()
  const s = route.query.seed ? parseInt(route.query.seed, 16) : randomSeed()
  await generateWorld(s)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (animFrameId) cancelAnimationFrame(animFrameId)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-bottom-enter-active, .slide-bottom-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-bottom-enter-from, .slide-bottom-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
