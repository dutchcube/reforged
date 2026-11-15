<script setup lang="ts">
import { computed } from 'vue'
import { lineGeometry } from '@/lib/progress'

const W = 320
const H = 160
const PAD = 14

const props = defineProps<{
  values: number[]
  /** Index van het gekozen punt. */
  selected: number
  /** Beschrijving voor schermlezers. */
  label: string
  /** Maakt van een waarde een leesbare tekst, bijv. "102,5kg". */
  format: (value: number) => string
}>()

const emit = defineEmits<{ 'update:selected': [index: number] }>()

const chart = computed(() => lineGeometry(props.values, W, H, PAD))
const active = computed(() => chart.value.dots[props.selected] ?? null)
/** Bij veel sessies worden losse punten ruis; dan tekenen we alleen de lijn. */
const showDots = computed(() => props.values.length <= 40)

/** Kiest het punt dat het dichtst bij de vinger of muis ligt. */
function pick(event: PointerEvent) {
  const dots = chart.value.dots
  if (!dots.length) return
  const box = (event.currentTarget as SVGElement).getBoundingClientRect()
  const x = ((event.clientX - box.left) / box.width) * W
  let nearest = 0
  for (let i = 1; i < dots.length; i++) {
    if (Math.abs(dots[i].x - x) < Math.abs(dots[nearest].x - x)) nearest = i
  }
  if (nearest !== props.selected) emit('update:selected', nearest)
}

function onMove(event: PointerEvent) {
  // muis: volgen bij hoveren; vinger: alleen tijdens het slepen
  if (event.pointerType === 'mouse' || event.buttons > 0) pick(event)
}

function onKey(event: KeyboardEvent) {
  const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
  if (!delta) return
  event.preventDefault()
  const next = Math.min(props.values.length - 1, Math.max(0, props.selected + delta))
  emit('update:selected', next)
}
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="w-full touch-pan-y rounded-lg outline-none select-none focus-visible:outline-2 focus-visible:outline-volt-500"
    role="img"
    tabindex="0"
    :aria-label="label"
    @pointerdown="pick"
    @pointermove="onMove"
    @keydown="onKey"
  >
    <!-- hulplijnen voor laagste en hoogste waarde -->
    <line x1="0" :x2="W" :y1="PAD" :y2="PAD" class="stroke-ink-600" stroke-dasharray="3 5" />
    <line x1="0" :x2="W" :y1="H - PAD" :y2="H - PAD" class="stroke-ink-600" stroke-dasharray="3 5" />
    <template v-if="chart.max !== chart.min">
      <text x="0" :y="PAD - 4" class="tabular fill-ink-400 text-[10px]">{{ format(chart.max) }}</text>
      <text x="0" :y="H - 2" class="tabular fill-ink-400 text-[10px]">{{ format(chart.min) }}</text>
    </template>

    <!-- loodlijn bij het gekozen punt -->
    <line
      v-if="active"
      :x1="active.x"
      :x2="active.x"
      :y1="PAD"
      :y2="H - PAD"
      class="stroke-ink-500"
    />

    <path
      :d="chart.path"
      fill="none"
      class="stroke-volt-500"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <template v-if="showDots">
      <circle
        v-for="(d, i) in chart.dots"
        :key="i"
        :cx="d.x"
        :cy="d.y"
        r="2.5"
        class="fill-volt-500"
      />
    </template>
    <!-- gekozen punt: groter, met een rand in de kleur van de kaart -->
    <circle
      v-if="active"
      :cx="active.x"
      :cy="active.y"
      r="5.5"
      class="fill-volt-500 stroke-ink-800"
      stroke-width="2"
    />
  </svg>
</template>
