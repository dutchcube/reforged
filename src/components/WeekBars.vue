<script setup lang="ts">
import { computed } from 'vue'
import { formatKg, formatShortDate } from '@/lib/format'
import type { WeekVolume } from '@/lib/stats'

const W = 320
const H = 120
const GAP = 4

const props = defineProps<{
  weeks: WeekVolume[]
  selected: number
}>()

const emit = defineEmits<{ 'update:selected': [index: number] }>()

const max = computed(() => Math.max(1, ...props.weeks.map((w) => w.volume)))

const bars = computed(() => {
  const n = props.weeks.length
  const width = (W - GAP * (n - 1)) / n
  return props.weeks.map((w, i) => {
    // een lege week krijgt een streepje, zodat de tijdlijn leesbaar blijft
    const height = w.volume > 0 ? Math.max(4, (w.volume / max.value) * H) : 2
    return { x: i * (width + GAP), y: H - height, width, height, empty: w.volume === 0 }
  })
})

/** Staaf met een afgeronde bovenkant en een rechte voet op de basislijn. */
function barPath(b: { x: number; y: number; width: number; height: number }): string {
  const r = Math.min(4, b.height, b.width / 2)
  return (
    `M${b.x} ${H} V${b.y + r} Q${b.x} ${b.y} ${b.x + r} ${b.y}` +
    ` H${b.x + b.width - r} Q${b.x + b.width} ${b.y} ${b.x + b.width} ${b.y + r} V${H} Z`
  )
}
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" role="group" aria-label="Volume per week">
      <g v-for="(b, i) in bars" :key="weeks[i].weekStart">
        <path
          :d="barPath(b)"
          :class="
            b.empty
              ? 'fill-ink-600'
              : i === selected
                ? 'fill-volt-500'
                : 'fill-volt-500/45'
          "
        />
        <!-- trefvlak over de volle hoogte: ook een lage staaf is makkelijk te raken -->
        <rect
          :x="b.x - GAP / 2"
          y="0"
          :width="b.width + GAP"
          :height="H"
          fill="transparent"
          class="cursor-pointer"
          role="button"
          tabindex="0"
          :aria-label="`Week van ${formatShortDate(weeks[i].weekStart)}: ${formatKg(weeks[i].volume)}`"
          :aria-pressed="i === selected"
          @click="emit('update:selected', i)"
          @pointerenter="(e: PointerEvent) => e.pointerType === 'mouse' && emit('update:selected', i)"
          @keydown.enter.space.prevent="emit('update:selected', i)"
        />
      </g>
    </svg>
    <div class="tabular mt-1 flex justify-between text-xs text-ink-400">
      <span>{{ formatShortDate(weeks[0].weekStart) }}</span>
      <span>deze week</span>
    </div>
  </div>
</template>
