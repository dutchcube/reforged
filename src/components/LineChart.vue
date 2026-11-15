<script setup lang="ts">
import { computed } from 'vue'
import { niceTicks } from '@/lib/progress'

const W = 320
const H = 176
/** Ruimte rond het tekenvlak: links voor de as-waarden, boven voor het label bij een punt. */
const M = { top: 14, right: 10, bottom: 10, left: 46 }

const props = defineProps<{
  values: number[]
  /** Index van het gekozen punt. */
  selected: number
  /** Beschrijving voor schermlezers. */
  label: string
  /** Maakt van een waarde een leesbare tekst, bijv. "102,5kg". */
  format: (value: number) => string
  /** Punten die open (niet gevuld) getekend worden, bijv. sessies waarin niet alles lukte. */
  hollow?: boolean[]
}>()

const emit = defineEmits<{ 'update:selected': [index: number] }>()

const innerW = W - M.left - M.right
const innerH = H - M.top - M.bottom

/** Ronde as-waarden; het tekenvlak loopt van de laagste tot de hoogste streep. */
const ticks = computed(() =>
  props.values.length ? niceTicks(Math.min(...props.values), Math.max(...props.values)) : [],
)

const yOf = (value: number) => {
  const lo = ticks.value[0]
  const hi = ticks.value[ticks.value.length - 1]
  return M.top + (1 - (value - lo) / (hi - lo || 1)) * innerH
}

const dots = computed(() =>
  props.values.map((v, i) => ({
    x: M.left + (props.values.length === 1 ? innerW / 2 : (i / (props.values.length - 1)) * innerW),
    y: yOf(v),
  })),
)

const path = computed(() =>
  dots.value.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(' '),
)

const active = computed(() => dots.value[props.selected] ?? null)
/** Bij veel sessies worden losse punten ruis; dan tekenen we alleen de lijn. */
const showDots = computed(() => props.values.length <= 40)

/** Label met de waarde bij het gekozen punt; het blijft binnen het vlak. */
const bubble = computed(() => {
  const dot = active.value
  if (!dot) return null
  const text = props.format(props.values[props.selected])
  const width = text.length * 6.4 + 14
  const height = 20
  const x = Math.min(W - M.right - width, Math.max(M.left, dot.x - width / 2))

  // Boven of onder het punt: de kant die binnen het vlak past en de minste andere
  // punten afdekt. Bij een gelijke stand wint boven.
  const covered = (y: number) =>
    dots.value.filter(
      (d, i) =>
        i !== props.selected &&
        d.x >= x - 6 &&
        d.x <= x + width + 6 &&
        d.y >= y - 6 &&
        d.y <= y + height + 6,
    ).length
  const options = [dot.y - 12 - height, dot.y + 12].filter((y) => y >= 0 && y + height <= H)
  const y = options.sort((a, b) => covered(a) - covered(b))[0] ?? Math.max(0, dot.y - 12 - height)

  return { text, width, height, x, y }
})

/** Kiest het punt dat het dichtst bij de vinger of muis ligt. */
function pick(event: PointerEvent) {
  if (!dots.value.length) return
  const box = (event.currentTarget as SVGElement).getBoundingClientRect()
  const x = ((event.clientX - box.left) / box.width) * W
  let nearest = 0
  for (let i = 1; i < dots.value.length; i++) {
    if (Math.abs(dots.value[i].x - x) < Math.abs(dots.value[nearest].x - x)) nearest = i
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
    <!-- as: een streep met waarde per ronde stap -->
    <g v-for="t in ticks" :key="t">
      <line
        :x1="M.left"
        :x2="W - M.right"
        :y1="yOf(t)"
        :y2="yOf(t)"
        class="stroke-ink-600"
        stroke-dasharray="2 4"
      />
      <text
        :x="M.left - 8"
        :y="yOf(t) + 3.5"
        text-anchor="end"
        class="tabular fill-ink-400 text-[10px]"
      >
        {{ format(t) }}
      </text>
    </g>

    <!-- loodlijn bij het gekozen punt -->
    <line
      v-if="active"
      :x1="active.x"
      :x2="active.x"
      :y1="M.top"
      :y2="H - M.bottom"
      class="stroke-ink-500"
    />

    <path
      :d="path"
      fill="none"
      class="stroke-volt-500"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <template v-if="showDots">
      <circle
        v-for="(d, i) in dots"
        :key="i"
        :cx="d.x"
        :cy="d.y"
        r="3"
        stroke-width="1.5"
        :class="hollow?.[i] ? 'fill-ink-800 stroke-volt-500' : 'fill-volt-500 stroke-volt-500'"
      />
    </template>

    <template v-if="active && bubble">
      <!-- gekozen punt: groter, met een rand in de kleur van de kaart -->
      <circle
        :cx="active.x"
        :cy="active.y"
        r="6"
        stroke-width="2"
        :class="hollow?.[selected] ? 'fill-ink-800 stroke-volt-500' : 'fill-volt-500 stroke-ink-800'"
      />
      <rect
        :x="bubble.x"
        :y="bubble.y"
        :width="bubble.width"
        :height="bubble.height"
        rx="6"
        class="fill-ink-600"
      />
      <text
        :x="bubble.x + bubble.width / 2"
        :y="bubble.y + 14"
        text-anchor="middle"
        class="tabular fill-ink-100 text-[11px] font-semibold"
      >
        {{ bubble.text }}
      </text>
    </template>
  </svg>
</template>
