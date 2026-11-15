<script setup lang="ts">
import { computed } from 'vue'
import { formatShortDate } from '@/lib/format'
import type { CalendarDay } from '@/lib/stats'

const props = defineProps<{
  /** Kolommen van weken (oudste eerst), elk zeven dagen vanaf maandag. */
  grid: CalendarDay[][]
  today: string
}>()

const DAYS = ['ma', '', 'wo', '', 'vr', '', 'zo']

const trained = computed(() => props.grid.flat().filter((d) => d.count > 0).length)

const summary = computed(
  () =>
    `${trained.value} trainingsdagen in de laatste ${props.grid.length} weken, vanaf ${formatShortDate(props.grid[0][0].key)}`,
)

function title(day: CalendarDay): string {
  const date = formatShortDate(day.key)
  if (day.count === 0) return `${date}: niet getraind`
  return day.count === 1 ? `${date}: getraind` : `${date}: ${day.count} trainingen`
}
</script>

<template>
  <div class="flex gap-1.5" role="img" :aria-label="summary">
    <div class="grid grid-rows-7 gap-1 text-[10px] leading-none text-ink-400" aria-hidden="true">
      <span v-for="(d, i) in DAYS" :key="i" class="flex items-center">{{ d }}</span>
    </div>
    <div
      class="grid flex-1 grid-flow-col grid-rows-7 gap-1"
      :style="{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <template v-for="week in grid" :key="week[0].key">
        <span
          v-for="day in week"
          :key="day.key"
          class="aspect-square rounded-[3px]"
          :class="[
            day.future ? 'bg-transparent' : day.count > 0 ? 'bg-volt-500' : 'bg-ink-700',
            day.key === today && 'ring-1 ring-ink-100 ring-offset-1 ring-offset-ink-800',
          ]"
          :title="day.future ? undefined : title(day)"
        />
      </template>
    </div>
  </div>
</template>
