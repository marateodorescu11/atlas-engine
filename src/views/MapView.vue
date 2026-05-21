<template>
  <div class="flex flex-col h-screen bg-[#080808] text-stone-100 overflow-hidden select-none">

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between px-6 h-14 border-b border-white/5 bg-[#0e0e0e] shrink-0">
      <div class="flex items-center gap-3">
        <GlobeIcon class="w-7 h-7 text-emerald-500" />
        <div class="flex items-center gap-2">
          <span class="font-display text-base font-semibold tracking-widest text-stone-100">ATLAS ENGINE</span>
          <span class="text-[10px] text-stone-700 tracking-widest uppercase hidden sm:inline">· Procedural World Generator</span>
        </div>
        <Transition name="fade">
          <div v-if="worldName" class="flex items-center gap-2 h-7 px-3 rounded bg-emerald-950/50 border border-emerald-900/60">
            <span class="text-[9px] text-emerald-800 uppercase tracking-widest">World</span>
            <span class="font-display text-sm text-emerald-400 tracking-wide">{{ worldName }}</span>
          </div>
        </Transition>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 h-8 px-3 rounded-md bg-white/5 border border-white/[0.06] text-xs font-mono">
          <span class="text-stone-600">seed</span>
          <span class="text-amber-400 tracking-wider">{{ seedHex }}</span>
          <button @click="copySeedLink" class="text-stone-600 hover:text-stone-300 transition-colors ml-0.5" title="Copy shareable link">
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

      <!-- Canvas area -->
      <div class="relative flex-1 overflow-hidden bg-[#080808]">
        <canvas
          ref="canvasRef"
          class="absolute inset-0 w-full h-full"
          :class="isGenerating ? 'opacity-20 cursor-wait' : 'cursor-crosshair'"
          style="transition: opacity 0.3s ease"
          @click="handleMapClick"
        />

        <!-- Vignette -->
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)"
        />

        <!-- Generating overlay -->
        <Transition name="fade">
          <div v-if="isGenerating" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="flex flex-col items-center gap-4">
              <div class="relative w-12 h-12">
                <div class="absolute inset-0 rounded-full border border-emerald-900 border-t-emerald-500 animate-spin" />
                <div class="absolute inset-0 flex items-center justify-center">
                  <GlobeIcon class="w-5 h-5 text-emerald-800" />
                </div>
              </div>
              <div class="text-center">
                <p class="text-sm text-stone-300 font-medium">Shaping the world</p>
                <p class="text-xs text-stone-600 font-mono mt-0.5">{{ seedHex }}</p>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Instruction banner -->
        <Transition name="slide-bottom">
          <div
            v-if="!isGenerating && selectedPoints.length < 2 && !routeStats"
            class="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-xs text-stone-400 pointer-events-none"
          >
            <span v-if="selectedPoints.length === 0">
              Click to set <span class="text-cyan-400 font-semibold">origin</span>
            </span>
            <span v-else>
              Click to set <span class="text-orange-400 font-semibold">destination</span>
            </span>
          </div>
        </Transition>

        <!-- Toasts -->
        <Transition name="fade">
          <div v-if="showCopied" class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-4 rounded-full bg-emerald-950/90 border border-emerald-800 text-xs text-emerald-400 backdrop-blur-sm">
            <CheckIcon class="w-3.5 h-3.5" /> Link copied
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="noPathFound" class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-4 rounded-full bg-red-950/90 border border-red-900 text-xs text-red-400 backdrop-blur-sm">
            No route found — destination unreachable
          </div>
        </Transition>
      </div>

      <!-- Sidebar -->
      <aside class="w-62 shrink-0 border-l border-white/5 bg-[#0e0e0e] flex flex-col overflow-y-auto" style="width:248px">

        <!-- Terrain legend -->
        <SideSection title="Terrain Types">
          <ul class="space-y-1.5">
            <li v-for="t in terrainList" :key="t.id" class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-white/10" :style="{ background: t.color }" />
              <span class="text-xs text-stone-400">{{ t.name }}</span>
              <span class="ml-auto text-[10px] text-stone-700 font-mono tabular-nums">
                {{ t.cost === Infinity ? '—' : `×${t.cost.toFixed(1)}` }}
              </span>
            </li>
          </ul>
        </SideSection>

        <!-- Route panel -->
        <SideSection title="Route">
          <div v-if="!routeStats && selectedPoints.length === 0" class="text-xs text-stone-700">
            Select two points on the map to pathfind.
          </div>

          <!-- Waypoints -->
          <div v-if="selectedPoints.length > 0" class="space-y-2 mb-3">
            <div class="flex items-center gap-2 text-xs">
              <span class="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-[9px] shrink-0">A</span>
              <span class="text-stone-500 font-mono text-[11px]">{{ selectedPoints[0].x }}, {{ selectedPoints[0].y }}</span>
              <span class="ml-auto text-[10px] text-stone-700 truncate max-w-[80px]">{{ terrainAt(selectedPoints[0]) }}</span>
            </div>
            <div v-if="selectedPoints.length > 1" class="flex items-center gap-2 text-xs">
              <span class="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-[9px] shrink-0">B</span>
              <span class="text-stone-500 font-mono text-[11px]">{{ selectedPoints[1].x }}, {{ selectedPoints[1].y }}</span>
              <span class="ml-auto text-[10px] text-stone-700 truncate max-w-[80px]">{{ terrainAt(selectedPoints[1]) }}</span>
            </div>
          </div>

          <!-- Route stats -->
          <Transition name="fade">
            <div v-if="routeStats" class="space-y-3">

              <!-- Narrative -->
              <p class="text-[11px] text-emerald-400 leading-relaxed italic">
                "{{ routeStats.narrative }}"
              </p>

              <!-- Stat grid -->
              <div class="grid grid-cols-2 gap-2">
                <StatCard label="Steps" :value="routeStats.steps.toLocaleString()" />
                <StatCard label="Travel cost" :value="routeStats.cost.toFixed(1)" accent />
                <StatCard label="Straight line" :value="`${routeStats.straightDist} cells`" />
                <StatCard label="Detour" :value="`×${routeStats.detourRatio.toFixed(2)}`" />
              </div>

              <!-- Avoided terrain -->
              <div v-if="routeStats.mountainRanges > 0 || routeStats.waterBodies > 0" class="space-y-1">
                <p class="text-[9px] text-stone-700 uppercase tracking-widest">Avoided</p>
                <div v-if="routeStats.mountainRanges > 0" class="flex items-center gap-2 text-[11px] text-stone-500">
                  <span class="w-2 h-2 rounded-sm shrink-0" :style="{ background: TERRAIN.MOUNTAIN.color }" />
                  {{ routeStats.mountainRanges }} mountain {{ routeStats.mountainRanges === 1 ? 'range' : 'ranges' }}
                </div>
                <div v-if="routeStats.waterBodies > 0" class="flex items-center gap-2 text-[11px] text-stone-500">
                  <span class="w-2 h-2 rounded-sm shrink-0" :style="{ background: TERRAIN.SHALLOW_WATER.color }" />
                  {{ routeStats.waterBodies }} water {{ routeStats.waterBodies === 1 ? 'body' : 'bodies' }}
                </div>
              </div>

              <!-- Terrain breakdown bar -->
              <div v-if="routeStats.breakdown.length > 0">
                <p class="text-[9px] text-stone-700 uppercase tracking-widest mb-1.5">Via</p>
                <div class="flex rounded-sm overflow-hidden h-1.5 gap-px">
                  <div
                    v-for="b in routeStats.breakdown"
                    :key="b.name"
                    :style="{ background: b.color, flex: b.steps }"
                    :title="`${b.name}: ${b.steps} steps`"
                  />
                </div>
                <ul class="mt-2 space-y-1">
                  <li v-for="b in routeStats.breakdown" :key="b.name" class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-sm shrink-0" :style="{ background: b.color }" />
                    <span class="text-[11px] text-stone-500">{{ b.name }}</span>
                    <span class="ml-auto text-[10px] text-stone-700 font-mono">{{ b.steps }}</span>
                  </li>
                </ul>
              </div>

              <!-- Animation progress -->
              <div v-if="isAnimating" class="flex items-center gap-2">
                <div class="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-orange-500 rounded-full transition-all duration-100"
                    :style="{ width: `${animProgress}%` }"
                  />
                </div>
                <span class="text-[10px] text-stone-700 font-mono shrink-0">{{ Math.round(animProgress) }}%</span>
              </div>
            </div>
          </Transition>

          <button
            v-if="selectedPoints.length > 0"
            @click="clearRoute"
            class="mt-4 w-full text-[11px] text-stone-700 hover:text-stone-400 transition-colors"
          >
            Clear route
          </button>
        </SideSection>

        <!-- Overlays -->
        <SideSection title="Overlays">
          <ToggleRow v-model="showHeatmap" label="Cost heatmap" color="amber" @change="redraw" />
          <ToggleRow v-model="showLandmarks" label="Landmarks" color="emerald" @change="redraw" class="mt-2" />
        </SideSection>

        <!-- Landmarks -->
        <Transition name="fade">
          <SideSection v-if="showLandmarks && landmarks.length > 0" title="Discovered Places">
            <ul class="space-y-1.5">
              <li v-for="lm in landmarks" :key="lm.name" class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: lm.terrain.color }" />
                <span class="text-[11px] text-stone-500 truncate">{{ lm.name }}</span>
              </li>
            </ul>
          </SideSection>
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
import { generateWorldName } from '../engine/worldname.js'
import { analyseRoute } from '../engine/routestats.js'
import { renderMap, renderHeatmap, renderLandmarks, renderMarkers, renderPath } from '../engine/renderer.js'

// ── Inline micro-components ───────────────────────────────────────────────────

const GlobeIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'inline-block' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('path', { d: 'M2 12h20' }), h('path', { d: 'M12 2a15.3 15.3 0 010 20' }), h('path', { d: 'M12 2a15.3 15.3 0 000 20' })]) })
const RefreshIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('path', { d: 'M3 12a9 9 0 0114-7.4L21 8M3 12l4-4' }), h('path', { d: 'M21 12a9 9 0 01-14 7.4L3 16m18-4l-4 4' })]) })
const CopyIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2' }), h('path', { d: 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' })]) })
const CheckIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', class: 'inline-block' }, [h('path', { d: 'M5 13l4 4L19 7' })]) })

const SideSection = defineComponent({
  props: ['title'],
  setup(props, { slots }) {
    return () => h('section', { class: 'px-4 py-4 border-b border-white/5' }, [
      h('h2', { class: 'text-[9px] font-semibold uppercase tracking-[0.15em] text-stone-700 mb-3' }, props.title),
      slots.default?.(),
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
const routeStats = ref(null)
const noPathFound = ref(false)
const landmarks = ref([])
const worldName = ref('')
const isAnimating = ref(false)
const animProgress = ref(0)

let map = null
let currentSeed = 0
let waterAnimId = null   // water shimmer loop
let pathAnimId = null    // path draw-in animation
let waterTime = 0
let drawnPath = []       // currently drawn portion of path

const terrainList = Object.values(TERRAIN)
const seedHex = computed(() => currentSeed.toString(16).padStart(8, '0').toUpperCase())

function terrainAt(pt) {
  if (!map || !pt) return ''
  return map[pt.y]?.[pt.x]?.terrain?.name ?? ''
}

// ── Water animation loop ──────────────────────────────────────────────────────

function startWaterAnimation() {
  if (waterAnimId) return
  let last = performance.now()

  function tick(now) {
    const dt = now - last
    last = now
    waterTime += dt

    if (!map || !canvasRef.value) { waterAnimId = null; return }
    compositeFrame()
    waterAnimId = requestAnimationFrame(tick)
  }
  waterAnimId = requestAnimationFrame(tick)
}

function stopWaterAnimation() {
  if (waterAnimId) { cancelAnimationFrame(waterAnimId); waterAnimId = null }
}

// Full composite: terrain (with animated water) + overlays + path + markers
function compositeFrame() {
  const canvas = canvasRef.value
  if (!canvas || !map) return

  renderMap(canvas, map, waterTime)

  if (showHeatmap.value) renderHeatmap(canvas, map)
  if (showLandmarks.value) renderLandmarks(canvas, map, landmarks.value)
  if (drawnPath.length > 1) renderPath(canvas, map, drawnPath)
  renderMarkers(canvas, map, selectedPoints.value)
}

function redraw() {
  compositeFrame()
}

// ── Canvas setup ──────────────────────────────────────────────────────────────

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas._logicalW = rect.width
  canvas._logicalH = rect.height
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
}

// ── World generation ──────────────────────────────────────────────────────────

async function generateWorld(seed) {
  isGenerating.value = true
  stopWaterAnimation()
  clearRoute()
  await nextTick()
  await new Promise(r => setTimeout(r, 50))

  currentSeed = seed !== undefined ? seed : randomSeed()
  map = generateHeightmap(MAP_COLS, MAP_ROWS, currentSeed)
  landmarks.value = generateLandmarks(map, currentSeed)
  worldName.value = generateWorldName(currentSeed)

  router.replace({ query: { seed: currentSeed.toString(16), world: worldName.value } })

  await nextTick()
  resizeCanvas()
  compositeFrame()

  isGenerating.value = false
  startWaterAnimation()
}

// ── Path animation ────────────────────────────────────────────────────────────

function animatePath(fullPath) {
  if (pathAnimId) cancelAnimationFrame(pathAnimId)
  drawnPath = []
  isAnimating.value = true
  animProgress.value = 0

  const total = fullPath.length
  // Adaptive speed: aim for ~1.5s total regardless of path length
  const targetFrames = 90
  const stepsPerFrame = Math.max(1, Math.ceil(total / targetFrames))

  function step() {
    const next = Math.min(drawnPath.length + stepsPerFrame, total)
    drawnPath = fullPath.slice(0, next)
    animProgress.value = (next / total) * 100

    if (next < total) {
      pathAnimId = requestAnimationFrame(step)
    } else {
      isAnimating.value = false
      pathAnimId = null
    }
  }

  pathAnimId = requestAnimationFrame(step)
}

// ── Map interaction ───────────────────────────────────────────────────────────

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
  }
}

function calculateRoute() {
  const [a, b] = selectedPoints.value
  const path = findPath(map, a.x, a.y, b.x, b.y)

  if (!path) {
    noPathFound.value = true
    return
  }

  routePath.value = path
  routeStats.value = analyseRoute(map, path, a.x, a.y, b.x, b.y)
  animatePath(path)
}

function clearRoute() {
  if (pathAnimId) { cancelAnimationFrame(pathAnimId); pathAnimId = null }
  selectedPoints.value = []
  routePath.value = null
  routeStats.value = null
  noPathFound.value = false
  drawnPath = []
  isAnimating.value = false
  animProgress.value = 0
}

// ── Seed sharing ──────────────────────────────────────────────────────────────

async function copySeedLink() {
  await navigator.clipboard.writeText(window.location.href)
  showCopied.value = true
  setTimeout(() => (showCopied.value = false), 2000)
}

// ── Resize ────────────────────────────────────────────────────────────────────

function onResize() { resizeCanvas(); compositeFrame() }

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
  stopWaterAnimation()
  if (pathAnimId) cancelAnimationFrame(pathAnimId)
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
