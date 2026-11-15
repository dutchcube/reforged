<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatDay, formatWeight } from '@/lib/format'
import { buildSeries, chartGeometry } from '@/lib/progress'
import { useHistoryStore } from '@/stores/history'

const CHART_W = 320
const CHART_H = 160

const history = useHistoryStore()
onMounted(() => history.fetchSessions())

const series = computed(() => buildSeries(history.sessions))

/** Gekozen oefening; valt terug op de eerste zolang er niets gekozen is. */
const picked = ref<string | null>(null)
const current = computed(
  () => series.value.find((s) => s.name === picked.value) ?? series.value[0] ?? null,
)

const points = computed(() => current.value?.points ?? [])
const chart = computed(() => chartGeometry(points.value, CHART_W, CHART_H, 12))

const stats = computed(() => {
  const p = points.value
  if (!p.length) return null
  const first = p[0].weight
  const last = p[p.length - 1].weight
  const diff = Number((last - first).toFixed(2))
  return {
    first,
    last,
    best: Math.max(...p.map((x) => x.weight)),
    diff: `${diff > 0 ? '+' : ''}${formatWeight(diff)}`,
  }
})
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-6">
      <h1 class="text-2xl font-bold">Voortgang</h1>
      <p class="text-xs text-ink-400">Gewicht per oefening, sessie na sessie.</p>
    </header>

    <p v-if="history.error" class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500">
      {{ history.error }}
    </p>

    <div v-if="history.loading && !history.loaded" class="card h-64 animate-pulse opacity-50" />

    <template v-else-if="current && stats">
      <!-- Oefening kiezen -->
      <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Oefening">
        <button
          v-for="s in series"
          :key="s.name"
          type="button"
          role="tab"
          :aria-selected="s.name === current.name"
          class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
          :class="
            s.name === current.name
              ? 'border-volt-500 bg-volt-500 text-ink-900'
              : 'border-ink-600 text-ink-400 hover:text-ink-100'
          "
          @click="picked = s.name"
        >
          {{ s.name }}
        </button>
      </div>

      <section class="card p-4">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="truncate text-lg font-semibold">{{ current.name }}</h2>
          <p class="tabular shrink-0 font-display text-lg font-bold text-volt-500">
            {{ formatWeight(stats.last) }}
          </p>
        </div>

        <svg
          :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
          class="mt-3 w-full"
          role="img"
          :aria-label="`${current.name}: van ${formatWeight(stats.first)} naar ${formatWeight(stats.last)} in ${points.length} sessies`"
        >
          <!-- hulplijnen voor laagste en hoogste gewicht -->
          <line x1="0" :x2="CHART_W" y1="12" y2="12" class="stroke-ink-600" stroke-dasharray="3 5" />
          <line
            x1="0"
            :x2="CHART_W"
            :y1="CHART_H - 12"
            :y2="CHART_H - 12"
            class="stroke-ink-600"
            stroke-dasharray="3 5"
          />
          <path
            :d="chart.path"
            fill="none"
            class="stroke-volt-500"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-for="(d, i) in chart.dots"
            :key="i"
            :cx="d.x"
            :cy="d.y"
            :r="i === chart.dots.length - 1 ? 5 : 3"
            class="fill-volt-500"
          />
        </svg>

        <div class="tabular mt-1 flex justify-between text-xs text-ink-400">
          <span>{{ formatDay(points[0].at) }}</span>
          <span v-if="chart.max !== chart.min">
            {{ formatWeight(chart.min) }} – {{ formatWeight(chart.max) }}
          </span>
          <span>{{ formatDay(points[points.length - 1].at) }}</span>
        </div>
      </section>

      <dl class="mt-3 grid grid-cols-3 gap-3 text-center">
        <div class="card p-3">
          <dt class="text-xs text-ink-400">Begin</dt>
          <dd class="tabular mt-1 font-display font-semibold">{{ formatWeight(stats.first) }}</dd>
        </div>
        <div class="card p-3">
          <dt class="text-xs text-ink-400">Hoogste</dt>
          <dd class="tabular mt-1 font-display font-semibold">{{ formatWeight(stats.best) }}</dd>
        </div>
        <div class="card p-3">
          <dt class="text-xs text-ink-400">Verschil</dt>
          <dd class="tabular mt-1 font-display font-semibold">{{ stats.diff }}</dd>
        </div>
      </dl>

      <p class="tabular mt-3 text-center text-xs text-ink-400">
        {{ points.length }} {{ points.length === 1 ? 'sessie' : 'sessies' }} met deze oefening
      </p>
    </template>

    <div v-else class="card p-8 text-center">
      <p class="font-display text-lg font-semibold">Nog niets te zien</p>
      <p class="mt-1 text-sm text-ink-400">
        Rond een workout af met een gewicht per oefening, dan verschijnt hier de grafiek.
      </p>
    </div>
  </main>
</template>
