<template>
  <div class="flex flex-col h-screen bg-[#09090b] text-stone-100 overflow-hidden select-none">

    <!-- ── Header ── -->
    <header class="relative z-20 flex items-center h-12 px-4 border-b border-white/[0.06] bg-[#09090b] shrink-0 gap-3">
      <!-- Brand -->
      <div class="flex items-center gap-2.5 shrink-0">
        <div class="w-7 h-7 rounded-full border border-emerald-700/60 flex items-center justify-center bg-emerald-950/60">
          <GlobeIcon class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="flex items-baseline gap-2">
          <span class="font-display text-sm font-semibold tracking-[0.18em] text-stone-100 uppercase">Atlas Engine</span>
          <span class="text-[9px] text-stone-600 tracking-widest uppercase hidden md:inline">Procedural World Generator</span>
        </div>
      </div>

      <!-- World name — centered -->
      <div class="flex-1 flex justify-center">
        <Transition name="fade">
          <button
            v-if="worldName"
            @click="copySeedLink"
            class="flex items-center gap-2 h-7 px-4 rounded-full bg-emerald-950/60 border border-emerald-800/50 hover:border-emerald-700/70 transition-colors group"
            title="Copy shareable link"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span class="font-display text-sm tracking-widest text-emerald-300 uppercase">{{ worldName }}</span>
          </button>
        </Transition>
      </div>

      <!-- Right controls -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Seed (hidden on small screens — accessible via world name pill copy) -->
        <div class="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded bg-white/5 border border-white/[0.06] text-xs font-mono">
          <span class="text-amber-400 tracking-wider tabular-nums">{{ seedDecimal }}</span>
          <button @click="copySeedLink" class="text-stone-600 hover:text-stone-300 transition-colors" title="Copy link">
            <CopyIcon class="w-3 h-3" />
          </button>
        </div>

        <button
          @click="generateWorld()"
          :disabled="isGenerating"
          class="flex items-center gap-1.5 h-7 px-3 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all active:scale-[0.97]"
        >
          <RefreshIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': isGenerating }" />
          <span class="hidden sm:inline">New World</span>
        </button>

        <button
          @click="exportPNG"
          :disabled="isGenerating"
          class="hidden sm:flex items-center gap-1.5 h-7 px-3 rounded bg-white/5 hover:bg-white/10 border border-white/[0.06] disabled:opacity-40 text-stone-300 text-xs font-medium tracking-wide transition-all active:scale-[0.97]"
        >
          <DownloadIcon class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Export PNG</span>
        </button>

        <!-- Mobile panel toggle (hidden on desktop) -->
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="lg:hidden flex items-center justify-center w-7 h-7 rounded bg-white/5 border border-white/[0.06] text-stone-400 active:bg-white/10 transition-colors"
          :aria-label="sidebarOpen ? 'Close panel' : 'Open panel'"
        >
          <PanelIcon class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- ── Body ── -->
    <div class="flex flex-1 overflow-hidden relative min-h-0">

      <!-- ── Map canvas ── -->
      <div class="relative flex-1 overflow-hidden bg-black">
        <canvas
          ref="canvasRef"
          class="absolute inset-0 w-full h-full"
          :class="isGenerating ? 'opacity-20 cursor-wait' : 'cursor-crosshair'"
          style="transition: opacity 0.3s ease"
          @click="handleMapClick"
          @mousemove="handleMouseMove"
          @mouseleave="hoverCell = null"
        />

        <!-- Vignette -->
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.65) 100%)"
        />

        <!-- Hover tooltip -->
        <Transition name="fade">
          <div
            v-if="hoverCell && !isGenerating"
            class="absolute pointer-events-none z-10 flex items-center gap-2 h-7 px-3 rounded bg-black/80 backdrop-blur-sm border border-white/10 text-xs font-mono whitespace-nowrap"
            :style="tooltipStyle"
          >
            <span class="text-stone-500">x: <span class="text-stone-300">{{ String(hoverCell.x).padStart(3, '0') }}</span></span>
            <span class="text-stone-700">·</span>
            <span class="text-stone-500">y: <span class="text-stone-300">{{ String(hoverCell.y).padStart(3, '0') }}</span></span>
            <span class="text-stone-700">|</span>
            <span class="text-stone-200">{{ hoverCell.terrain }}</span>
          </div>
        </Transition>

        <!-- Generating overlay -->
        <Transition name="fade">
          <div v-if="isGenerating" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="flex flex-col items-center gap-4">
              <div class="relative w-11 h-11">
                <div class="absolute inset-0 rounded-full border border-emerald-900 border-t-emerald-500 animate-spin" />
                <div class="absolute inset-0 flex items-center justify-center">
                  <GlobeIcon class="w-4 h-4 text-emerald-800" />
                </div>
              </div>
              <p class="text-sm text-stone-400 font-medium">Generating world…</p>
            </div>
          </div>
        </Transition>

        <!-- Instruction banner -->
        <Transition name="slide-bottom">
          <div
            v-if="!isGenerating && selectedPoints.length < 2 && !routeStats"
            class="absolute bottom-16 lg:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 h-8 px-5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs text-stone-400 pointer-events-none"
          >
            <span v-if="selectedPoints.length === 0">Click to set <span class="text-cyan-400 font-semibold">origin</span></span>
            <span v-else>Click to set <span class="text-orange-400 font-semibold">destination</span></span>
          </div>
        </Transition>

        <!-- Toast: copied -->
        <Transition name="fade">
          <div v-if="showCopied" class="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 h-7 px-4 rounded-full bg-emerald-950/90 border border-emerald-800 text-xs text-emerald-400">
            <CheckIcon class="w-3 h-3" /> Link copied
          </div>
        </Transition>

        <!-- Toast: no path -->
        <Transition name="fade">
          <div v-if="noPathFound" class="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 h-7 px-4 rounded-full bg-red-950/90 border border-red-900 text-xs text-red-400">
            No route found — destination unreachable
          </div>
        </Transition>

        <!-- FAB — mobile only, opens bottom sheet -->
        <button
          @click="sidebarOpen = true"
          class="lg:hidden absolute bottom-5 right-4 flex items-center gap-2 h-9 px-4 rounded-full bg-[#0f0f12]/95 border border-white/10 text-stone-300 text-xs font-medium shadow-lg active:scale-95 transition-transform z-10"
        >
          <PanelIcon class="w-3.5 h-3.5" />
          <span>Map Controls</span>
        </button>
      </div>

      <!-- ── Sidebar — right panel on desktop, bottom sheet on mobile ── -->
      <aside
        class="bg-[#0f0f12] flex flex-col z-30 transition-transform duration-300 ease-out
               lg:relative lg:shrink-0 lg:w-[280px] lg:border-l lg:border-white/[0.06] lg:translate-y-0 lg:translate-x-0 lg:rounded-none lg:shadow-none lg:overflow-y-auto
               fixed bottom-0 left-0 right-0 max-h-[72vh] rounded-t-2xl border-t border-white/[0.08] overflow-y-auto shadow-2xl"
        :class="sidebarOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'"
      >
        <!-- Bottom-sheet drag handle (mobile only) -->
        <div class="lg:hidden flex flex-col items-center pt-2.5 pb-1 shrink-0 sticky top-0 bg-[#0f0f12] z-10">
          <div class="w-8 h-1 rounded-full bg-white/20" />
          <div class="flex items-center justify-between w-full px-4 mt-2">
            <span class="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-600">Controls</span>
            <button @click="sidebarOpen = false" class="text-stone-600 hover:text-stone-300 transition-colors p-1">
              <CloseIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        <!-- Mobile-only quick actions inside sheet -->
        <div class="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <button
            @click="generateWorld()"
            :disabled="isGenerating"
            class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
          >
            <RefreshIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': isGenerating }" />
            New World
          </button>
          <button
            @click="exportPNG"
            :disabled="isGenerating"
            class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded bg-white/5 border border-white/[0.06] disabled:opacity-40 text-stone-300 text-xs font-medium transition-all"
          >
            <DownloadIcon class="w-3.5 h-3.5" />
            Export PNG
          </button>
        </div>

        <!-- Overlays -->
        <CollapsibleSection title="Overlays" :open="sections.overlays" @toggle="sections.overlays = !sections.overlays">
          <label class="flex items-center gap-2.5 py-1 cursor-pointer group">
            <Checkbox v-model="showHeatmap" @change="onToggleHeatmap" />
            <span class="text-xs text-stone-400 group-hover:text-stone-200 transition-colors">Cost Heatmap</span>
          </label>
          <label class="flex items-center gap-2.5 py-1 cursor-pointer group">
            <Checkbox v-model="showLandmarks" @change="redraw" />
            <span class="text-xs text-stone-400 group-hover:text-stone-200 transition-colors">Landmarks</span>
          </label>
        </CollapsibleSection>

        <!-- Terrain types -->
        <CollapsibleSection title="Terrain Types" :open="sections.terrain" @toggle="sections.terrain = !sections.terrain">
          <ul class="space-y-2">
            <li v-for="t in terrainList" :key="t.id" class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: t.color }" />
              <span class="text-xs text-stone-400">{{ t.name }}</span>
              <span class="ml-auto text-[10px] font-mono tabular-nums" :class="t.cost === Infinity ? 'text-red-600' : 'text-amber-500'">
                {{ t.cost === Infinity ? '—' : `×${t.cost.toFixed(1)}` }}
              </span>
            </li>
          </ul>
        </CollapsibleSection>

        <!-- Route -->
        <CollapsibleSection title="Route" :open="sections.route" @toggle="sections.route = !sections.route">

          <!-- Waypoint cards -->
          <div class="space-y-2">
            <!-- A -->
            <div class="rounded-md border overflow-hidden" :class="selectedPoints.length > 0 ? 'border-cyan-900/60 bg-cyan-950/20' : 'border-white/[0.06] bg-white/[0.02]'">
              <div class="flex items-center gap-2.5 px-3 py-2.5">
                <span class="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-[9px] shrink-0">A</span>
                <div v-if="selectedPoints.length > 0">
                  <p class="text-xs font-mono text-cyan-300 font-semibold">{{ String(selectedPoints[0].x).padStart(3,'0') }}, {{ String(selectedPoints[0].y).padStart(3,'0') }}</p>
                  <p class="text-[10px] text-stone-500 mt-0.5">{{ terrainAt(selectedPoints[0]) }}</p>
                </div>
                <span v-else class="text-xs text-stone-600 italic">Not set</span>
              </div>
            </div>

            <!-- B -->
            <div class="rounded-md border overflow-hidden" :class="selectedPoints.length > 1 ? 'border-orange-900/60 bg-orange-950/20' : 'border-white/[0.06] bg-white/[0.02]'">
              <div class="flex items-center gap-2.5 px-3 py-2.5">
                <span class="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-[9px] shrink-0">B</span>
                <div v-if="selectedPoints.length > 1">
                  <p class="text-xs font-mono text-orange-300 font-semibold">{{ String(selectedPoints[1].x).padStart(3,'0') }}, {{ String(selectedPoints[1].y).padStart(3,'0') }}</p>
                  <p class="text-[10px] text-stone-500 mt-0.5">{{ terrainAt(selectedPoints[1]) }}</p>
                </div>
                <span v-else class="text-xs text-stone-600 italic">Not set</span>
              </div>
            </div>
          </div>

          <!-- Route results -->
          <Transition name="fade">
            <div v-if="routeStats" class="mt-4 space-y-4">

              <!-- Narrative -->
              <p class="text-[11px] text-stone-400 leading-relaxed italic border-l-2 border-stone-700 pl-2.5">
                {{ routeStats.narrative }}
              </p>

              <!-- Stats grid -->
              <div class="grid grid-cols-2 gap-2">
                <StatBlock label="Steps"         :value="routeStats.steps.toLocaleString()" />
                <StatBlock label="Travel Cost"   :value="routeStats.cost.toFixed(1)" accent />
                <StatBlock label="Straight-Line" :value="routeStats.straightDist" />
                <StatBlock label="Detour"        :value="`×${routeStats.detourRatio.toFixed(2)}`" />
              </div>

              <!-- Terrain breakdown bar -->
              <div>
                <p class="text-[9px] text-stone-700 uppercase tracking-widest mb-2">Terrain Breakdown</p>
                <div class="flex rounded overflow-hidden h-1.5 gap-px">
                  <div
                    v-for="b in routeStats.breakdown"
                    :key="b.name"
                    :style="{ background: b.color, flex: b.steps }"
                    :title="`${b.name}: ${b.steps} steps`"
                  />
                </div>
                <ul class="mt-2 space-y-1.5">
                  <li v-for="b in routeStats.breakdown" :key="b.name" class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-sm shrink-0" :style="{ background: b.color }" />
                    <span class="text-[11px] text-stone-500">{{ b.name }}</span>
                    <span class="ml-auto text-[10px] text-stone-700 font-mono">{{ b.steps }}</span>
                  </li>
                </ul>
              </div>

              <!-- Animation progress -->
              <div v-if="isAnimating" class="flex items-center gap-2">
                <div class="flex-1 h-px bg-white/5 overflow-hidden">
                  <div class="h-full bg-orange-500 transition-all duration-75" :style="{ width: `${animProgress}%` }" />
                </div>
                <span class="text-[10px] text-stone-700 font-mono shrink-0">{{ Math.round(animProgress) }}%</span>
              </div>
            </div>
          </Transition>

          <button
            v-if="selectedPoints.length > 0"
            @click="clearRoute"
            class="mt-4 w-full text-[11px] text-stone-700 hover:text-stone-400 transition-colors text-center py-1"
          >
            Clear route
          </button>
        </CollapsibleSection>

        <!-- Discovered places -->
        <CollapsibleSection
          v-if="showLandmarks && landmarks.length > 0"
          title="Discovered Places"
          :open="sections.places"
          @toggle="sections.places = !sections.places"
        >
          <ul class="space-y-2">
            <li v-for="lm in landmarks" :key="lm.name" class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: lm.terrain.color }" />
              <span class="text-[11px] text-stone-500 truncate">{{ lm.name }}</span>
            </li>
          </ul>
        </CollapsibleSection>
      </aside>

      <!-- Mobile bottom-sheet backdrop -->
      <Transition name="fade">
        <div
          v-if="sidebarOpen"
          class="lg:hidden fixed inset-0 bg-black/60 z-20 backdrop-blur-[2px]"
          @click="sidebarOpen = false"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick, defineComponent, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { generateHeightmap, TERRAIN } from '../engine/terrain.js'
import { findPath } from '../engine/pathfinder.js'
import { generateLandmarks } from '../engine/landmarks.js'
import { randomSeed } from '../engine/rng.js'
import { generateWorldName } from '../engine/worldname.js'
import { analyseRoute } from '../engine/routestats.js'
import {
  prerenderTerrain,
  prerenderHeatmap,
  prerenderLandmarks,
  invalidateHeatmap,
  invalidateLandmarks,
  compositeFrame as rendererComposite,
} from '../engine/renderer.js'

// ── Micro-components ──────────────────────────────────────────────────────────

const GlobeIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', class: 'inline-block' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('path', { d: 'M2 12h20' }), h('path', { d: 'M12 2a15.3 15.3 0 010 20' }), h('path', { d: 'M12 2a15.3 15.3 0 000 20' })]) })
const RefreshIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('path', { d: 'M3 12a9 9 0 0114-7.4L21 8M3 12l4-4' }), h('path', { d: 'M21 12a9 9 0 01-14 7.4L3 16m18-4l-4 4' })]) })
const CopyIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2' }), h('path', { d: 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' })]) })
const DownloadIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }), h('polyline', { points: '7 10 12 15 17 10' }), h('line', { x1: '12', y1: '15', x2: '12', y2: '3' })]) })
const CheckIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', class: 'inline-block' }, [h('path', { d: 'M5 13l4 4L19 7' })]) })
const PanelIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }), h('line', { x1: '15', y1: '3', x2: '15', y2: '21' })]) })
const CloseIcon = defineComponent({ render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'inline-block' }, [h('path', { d: 'M18 6L6 18M6 6l12 12' })]) })
const ChevronIcon = defineComponent({ props: ['open'], render(props) { return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', class: `inline-block transition-transform duration-200 ${props.open ? '' : '-rotate-90'}` }, [h('path', { d: 'M6 9l6 6 6-6' })]) } })

const Checkbox = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    return () => h('div', {
      class: `w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${props.modelValue ? 'bg-emerald-600 border-emerald-500' : 'bg-transparent border-stone-700 hover:border-stone-500'}`,
      onClick: () => { emit('update:modelValue', !props.modelValue); emit('change') },
    }, props.modelValue ? [h('svg', { viewBox: '0 0 12 12', fill: 'none', stroke: 'white', 'stroke-width': '2', 'stroke-linecap': 'round', class: 'w-2.5 h-2.5' }, [h('path', { d: 'M2 6l3 3 5-5' })])] : [])
  },
})

const CollapsibleSection = defineComponent({
  props: ['title', 'open'],
  emits: ['toggle'],
  setup(props, { slots, emit }) {
    return () => h('section', { class: 'border-b border-white/[0.06]' }, [
      h('button', {
        class: 'w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors',
        onClick: () => emit('toggle'),
      }, [
        h('span', { class: 'text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-600' }, props.title),
        h(ChevronIcon, { open: props.open, class: 'w-3.5 h-3.5 text-stone-700' }),
      ]),
      props.open ? h('div', { class: 'px-4 pb-4' }, slots.default?.()) : null,
    ])
  },
})

const StatBlock = defineComponent({
  props: ['label', 'value', 'accent'],
  setup(props) {
    return () => h('div', { class: 'rounded bg-white/[0.04] border border-white/[0.05] px-3 py-2.5' }, [
      h('p', { class: 'text-[9px] text-stone-600 uppercase tracking-widest mb-0.5' }, props.label),
      h('p', { class: `text-sm font-semibold font-mono ${props.accent ? 'text-amber-400' : 'text-stone-200'}` }, props.value),
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
const routeStats = ref(null)
const noPathFound = ref(false)
const landmarks = ref([])
const worldName = ref('')
const isAnimating = ref(false)
const animProgress = ref(0)
const sidebarOpen = ref(false)
const hoverCell = ref(null)
const mousePos = ref({ x: 0, y: 0 })

const sections = reactive({ overlays: true, terrain: true, route: true, places: true })

let map = null
let currentSeed = 0
let waterAnimId = null
let pathAnimId = null
let waterTime = 0
let drawnPath = []

const terrainList = Object.values(TERRAIN)
const seedDecimal = computed(() => currentSeed.toString(10))

const tooltipStyle = computed(() => {
  const x = mousePos.value.x
  const y = mousePos.value.y
  const canvas = canvasRef.value
  if (!canvas) return {}
  const rect = canvas.getBoundingClientRect()
  const offRight = x + 160 > rect.width
  const offBottom = y + 40 > rect.height
  return {
    left: offRight ? `${x - 155}px` : `${x + 14}px`,
    top: offBottom ? `${y - 36}px` : `${y + 10}px`,
  }
})

function terrainAt(pt) {
  if (!map || !pt) return ''
  return map[pt.y]?.[pt.x]?.terrain?.name ?? ''
}

// ── Water animation ───────────────────────────────────────────────────────────

function startWaterAnimation() {
  if (waterAnimId) return
  let last = performance.now()
  function tick(now) {
    waterTime += now - last
    last = now
    if (map && canvasRef.value) frame()
    waterAnimId = requestAnimationFrame(tick)
  }
  waterAnimId = requestAnimationFrame(tick)
}

function stopWaterAnimation() {
  if (waterAnimId) { cancelAnimationFrame(waterAnimId); waterAnimId = null }
}

function frame() {
  const canvas = canvasRef.value
  if (!canvas || !map) return
  rendererComposite(canvas, map, waterTime, {
    showHeatmap: showHeatmap.value,
    showLandmarks: showLandmarks.value,
    path: drawnPath.length > 1 ? drawnPath : null,
    markers: selectedPoints.value,
  })
}

function redraw() { frame() }

function onToggleHeatmap() {
  // Build heatmap cache lazily — only runs once per world since prerenderHeatmap
  // is cheap to call but we avoid it on every toggle-off
  if (showHeatmap.value && map) prerenderHeatmap(canvasRef.value, map)
  frame()
}

// ── Canvas ────────────────────────────────────────────────────────────────────

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas._logicalW = rect.width
  canvas._logicalH = rect.height
  canvas.getContext('2d').scale(dpr, dpr)
}

// ── Generation ────────────────────────────────────────────────────────────────

async function generateWorld(seed) {
  isGenerating.value = true
  stopWaterAnimation()
  clearRoute()
  sidebarOpen.value = false
  await nextTick()
  await new Promise(r => setTimeout(r, 50))

  currentSeed = seed !== undefined ? seed : randomSeed()
  map = generateHeightmap(MAP_COLS, MAP_ROWS, currentSeed)
  landmarks.value = generateLandmarks(map, currentSeed)
  worldName.value = generateWorldName(currentSeed)

  router.replace({ query: { seed: currentSeed.toString(16), world: worldName.value } })

  await nextTick()
  resizeCanvas()

  // Pre-render all static layers once — animation loop blits these cheaply
  prerenderTerrain(canvasRef.value, map)
  prerenderLandmarks(canvasRef.value, map, landmarks.value)
  invalidateHeatmap()
  if (showHeatmap.value) prerenderHeatmap(canvasRef.value, map)

  frame()
  isGenerating.value = false
  startWaterAnimation()
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportPNG() {
  const canvas = canvasRef.value
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `atlas-${worldName.value || currentSeed.toString(16)}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ── Path animation ────────────────────────────────────────────────────────────

function animatePath(fullPath) {
  if (pathAnimId) cancelAnimationFrame(pathAnimId)
  drawnPath = []
  isAnimating.value = true
  animProgress.value = 0
  const total = fullPath.length
  const stepsPerFrame = Math.max(1, Math.ceil(total / 90))

  function step() {
    const next = Math.min(drawnPath.length + stepsPerFrame, total)
    drawnPath = fullPath.slice(0, next)
    animProgress.value = (next / total) * 100
    if (next < total) { pathAnimId = requestAnimationFrame(step) }
    else { isAnimating.value = false; pathAnimId = null }
  }
  pathAnimId = requestAnimationFrame(step)
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
  sections.route = true

  if (selectedPoints.value.length === 2) calculateRoute()
}

function handleMouseMove(e) {
  if (!map || isGenerating.value) return
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const mx = Math.floor(((e.clientX - rect.left) / rect.width) * MAP_COLS)
  const my = Math.floor(((e.clientY - rect.top) / rect.height) * MAP_ROWS)
  mousePos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  if (mx >= 0 && my >= 0 && mx < MAP_COLS && my < MAP_ROWS) {
    const cell = map[my][mx]
    hoverCell.value = { x: mx, y: my, terrain: cell.terrain.name }
  } else {
    hoverCell.value = null
  }
}

function calculateRoute() {
  const [a, b] = selectedPoints.value
  const path = findPath(map, a.x, a.y, b.x, b.y)
  if (!path) { noPathFound.value = true; return }

  routeStats.value = analyseRoute(map, path, a.x, a.y, b.x, b.y)
  animatePath(path)
}

function clearRoute() {
  if (pathAnimId) { cancelAnimationFrame(pathAnimId); pathAnimId = null }
  selectedPoints.value = []
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

// ── Lifecycle ─────────────────────────────────────────────────────────────────

watch(sidebarOpen, (open) => {
  document.body.classList.toggle('sheet-open', open)
})

function onResize() {
  resizeCanvas()
  if (map) {
    // Caches are pixel-resolution-dependent — rebuild after resize
    prerenderTerrain(canvasRef.value, map)
    prerenderLandmarks(canvasRef.value, map, landmarks.value)
    invalidateHeatmap()
  }
  frame()
}

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
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-bottom-enter-from, .slide-bottom-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}

/* Prevent body scroll when bottom sheet is open on mobile */
:global(body.sheet-open) { overflow: hidden; }
</style>
