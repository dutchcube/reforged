<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import LineChart from '@/components/LineChart.vue'
import TrainingCalendar from '@/components/TrainingCalendar.vue'
import WeekBars from '@/components/WeekBars.vue'
import { formatDay, formatKg, formatShortDate, formatWeight } from '@/lib/format'
import { FAILS_BEFORE_DELOAD } from '@/lib/progression'
import { buildSeries } from '@/lib/progress'
import {
  bodyWeightSeries,
  buildRecords,
  calendarGrid,
  consistency,
  dayKey,
  exerciseHealth,
  weeklyVolume,
} from '@/lib/stats'
import { useHistoryStore } from '@/stores/history'

const CALENDAR_WEEKS = 16
const VOLUME_WEEKS = 12

type Metric = 'weight' | 'e1rm' | 'volume'
const METRICS: Array<{ key: Metric; label: string; hint: string }> = [
  { key: 'weight', label: 'Gewicht', hint: 'Het gewicht op de stang, sessie na sessie.' },
  { key: 'e1rm', label: '1RM', hint: 'Geschat maximum voor één herhaling (Epley), op basis van je beste set.' },
  { key: 'volume', label: 'Volume', hint: 'Gewicht × alle gehaalde reps in die sessie.' },
]

const history = useHistoryStore()
onMounted(() => history.fetchSessions())

const tab = ref<'exercises' | 'overview'>('exercises')

// ------------------------------------------------------------------ per oefening
const series = computed(() => buildSeries(history.sessions))

/** Gekozen oefening; valt terug op de eerste zolang er niets gekozen is. */
const picked = ref<string | null>(null)
const current = computed(
  () => series.value.find((s) => s.name === picked.value) ?? series.value[0] ?? null,
)

const metric = ref<Metric>('weight')
const metricInfo = computed(() => METRICS.find((m) => m.key === metric.value)!)

/** Meetpunten voor de gekozen maat; sessies zonder gehaalde rep hebben geen 1RM. */
const points = computed(() =>
  (current.value?.points ?? [])
    .map((p) => ({ at: p.at, value: p[metric.value] }))
    .filter((p): p is { at: string; value: number } => p.value !== null),
)

const format = (value: number) => (metric.value === 'volume' ? formatKg(value) : formatWeight(value))

/** Gekozen punt in de grafiek; standaard het nieuwste. */
const selected = ref(0)
watch(points, (p) => (selected.value = Math.max(0, p.length - 1)), { immediate: true })
const selectedPoint = computed(() => points.value[selected.value] ?? null)

const stats = computed(() => {
  const p = points.value
  if (!p.length) return null
  const first = p[0].value
  const last = p[p.length - 1].value
  const diff = Number((last - first).toFixed(1))
  return {
    first: format(first),
    best: format(Math.max(...p.map((x) => x.value))),
    diff: `${diff > 0 ? '+' : ''}${format(diff)}`,
  }
})

const records = computed(() => buildRecords(history.sessions))
const currentRecord = computed(() => records.value.find((r) => r.name === current.value?.name) ?? null)

const health = computed(() => exerciseHealth(history.sessions))
const currentHealth = computed(() => health.value.find((h) => h.name === current.value?.name) ?? null)

/** Verhouding tussen het zwaarste gewicht en je laatst ingevulde lichaamsgewicht. */
const bodyRatio = computed(() => {
  const body = history.lastBodyWeight
  if (!body || !currentRecord.value) return null
  return (currentRecord.value.maxWeight / body).toFixed(2).replace('.', ',')
})

// --------------------------------------------------------------------- overzicht
const now = new Date()
const today = dayKey(now)
const totals = computed(() => consistency(history.sessions, now))
const grid = computed(() => calendarGrid(history.sessions, CALENDAR_WEEKS, now))

const weeks = computed(() => weeklyVolume(history.sessions, VOLUME_WEEKS, now))
const selectedWeek = ref(VOLUME_WEEKS - 1)
const week = computed(() => weeks.value[selectedWeek.value])

const body = computed(() => bodyWeightSeries(history.sessions))
const selectedBody = ref(0)
watch(body, (b) => (selectedBody.value = Math.max(0, b.length - 1)), { immediate: true })
const bodyPoint = computed(() => body.value[selectedBody.value] ?? null)
const bodyDiff = computed(() => {
  if (body.value.length < 2) return ''
  const diff = Number((body.value[body.value.length - 1].weight - body.value[0].weight).toFixed(1))
  return `${diff > 0 ? '+' : ''}${formatWeight(diff)} sinds ${formatShortDate(body.value[0].at)}`
})

function healthText(h: { weight: number; failStreak: number; drops: number }): string {
  const parts: string[] = []
  if (h.failStreak > 0) {
    const left = FAILS_BEFORE_DELOAD - h.failStreak
    parts.push(
      `${h.failStreak}× op rij niet alle sets gehaald op ${formatWeight(h.weight)}` +
        (left > 0 ? `; nog ${left}× en het gewicht gaat omlaag` : ''),
    )
  }
  if (h.drops > 0) parts.push(`${h.drops}× gewicht verlaagd`)
  return parts.join(' · ')
}
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-4">
      <h1 class="text-2xl font-bold">Voortgang</h1>
      <p class="text-xs text-ink-400">Je kracht, je records en hoe trouw je traint.</p>
    </header>

    <p v-if="history.error" class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500">
      {{ history.error }}
    </p>

    <div v-if="history.loading && !history.loaded" class="card h-64 animate-pulse opacity-50" />

    <div v-else-if="!history.sessions.length" class="card p-8 text-center">
      <p class="font-display text-lg font-semibold">Nog niets te zien</p>
      <p class="mt-1 text-sm text-ink-400">
        Rond een workout af, dan verschijnen hier je grafieken en records.
      </p>
    </div>

    <template v-else>
      <!-- Oefeningen / Overzicht -->
      <div class="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink-800 p-1" role="tablist">
        <button
          v-for="t in [
            { key: 'exercises', label: 'Oefeningen' },
            { key: 'overview', label: 'Overzicht' },
          ] as const"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="tab === t.key"
          class="rounded-lg py-2 text-sm font-semibold transition"
          :class="tab === t.key ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-100'"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- ============================================================ Oefeningen -->
      <template v-if="tab === 'exercises'">
        <template v-if="current">
          <div class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Oefening">
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
            <div class="flex items-start justify-between gap-3">
              <h2 class="truncate text-lg font-semibold">{{ current.name }}</h2>
              <div class="flex shrink-0 gap-1 rounded-lg bg-ink-700 p-0.5" role="group" aria-label="Maat">
                <button
                  v-for="m in METRICS"
                  :key="m.key"
                  type="button"
                  class="rounded-md px-2 py-1 text-xs font-semibold transition"
                  :class="metric === m.key ? 'bg-ink-500 text-ink-100' : 'text-ink-400 hover:text-ink-100'"
                  :aria-pressed="metric === m.key"
                  @click="metric = m.key"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>

            <template v-if="selectedPoint && stats">
              <p class="tabular mt-3 font-display text-2xl font-bold" aria-live="polite">
                {{ format(selectedPoint.value) }}
                <span class="ml-1 text-xs font-normal text-ink-400">
                  {{ formatDay(selectedPoint.at).toLowerCase() }}
                </span>
              </p>

              <LineChart
                v-model:selected="selected"
                class="mt-2"
                :values="points.map((p) => p.value)"
                :format="format"
                :label="`${current.name}, ${metricInfo.label.toLowerCase()}: van ${stats.first} naar ${format(points[points.length - 1].value)} in ${points.length} sessies`"
              />

              <div class="tabular mt-1 flex justify-between text-xs text-ink-400">
                <span>{{ formatShortDate(points[0].at) }}</span>
                <span>{{ points.length }} {{ points.length === 1 ? 'sessie' : 'sessies' }}</span>
                <span>{{ formatShortDate(points[points.length - 1].at) }}</span>
              </div>
            </template>
            <p v-else class="mt-4 text-sm text-ink-400">Nog geen gehaalde reps voor deze oefening.</p>

            <p class="mt-3 text-xs leading-relaxed text-ink-400">{{ metricInfo.hint }}</p>
          </section>

          <dl v-if="stats" class="mt-3 grid grid-cols-3 gap-3 text-center">
            <div class="card p-3">
              <dt class="text-xs text-ink-400">Begin</dt>
              <dd class="tabular mt-1 font-display font-semibold">{{ stats.first }}</dd>
            </div>
            <div class="card p-3">
              <dt class="text-xs text-ink-400">Hoogste</dt>
              <dd class="tabular mt-1 font-display font-semibold">{{ stats.best }}</dd>
            </div>
            <div class="card p-3">
              <dt class="text-xs text-ink-400">Verschil</dt>
              <dd class="tabular mt-1 font-display font-semibold">{{ stats.diff }}</dd>
            </div>
          </dl>

          <section v-if="currentRecord" class="card mt-3 p-4">
            <h3 class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Records</h3>
            <dl class="mt-2 space-y-2 text-sm">
              <div class="flex items-baseline justify-between gap-3">
                <dt>Zwaarste gewicht</dt>
                <dd class="tabular shrink-0">
                  <span class="font-semibold">{{ formatWeight(currentRecord.maxWeight) }}</span>
                  <span class="ml-1.5 text-xs text-ink-400">
                    {{ formatShortDate(currentRecord.maxWeightAt) }}
                  </span>
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                <dt>Geschatte 1RM</dt>
                <dd class="tabular shrink-0">
                  <span class="font-semibold">{{ formatWeight(currentRecord.maxE1RM) }}</span>
                  <span class="ml-1.5 text-xs text-ink-400">
                    {{ formatShortDate(currentRecord.maxE1RMAt) }}
                  </span>
                </dd>
              </div>
              <div v-if="bodyRatio" class="flex items-baseline justify-between gap-3">
                <dt>Ten opzichte van lichaamsgewicht</dt>
                <dd class="tabular shrink-0 font-semibold">{{ bodyRatio }}×</dd>
              </div>
            </dl>
          </section>

          <p
            v-if="currentHealth"
            class="mt-3 rounded-card border border-ink-600/60 bg-ink-800 p-4 text-sm"
          >
            <span class="font-semibold">Let op:</span>
            {{ healthText(currentHealth) }}.
          </p>
        </template>

        <div v-else class="card p-8 text-center">
          <p class="text-sm text-ink-400">
            Nog geen oefeningen met een gewicht. Vul bij Programma's een gewicht in, dan verschijnt
            hier de grafiek.
          </p>
        </div>
      </template>

      <!-- ============================================================= Overzicht -->
      <template v-else>
        <dl class="grid grid-cols-4 gap-2 text-center">
          <div class="card px-1 py-3">
            <dd class="tabular font-display text-xl font-bold">{{ totals.thisWeek }}</dd>
            <dt class="mt-0.5 text-[11px] text-ink-400">deze week</dt>
          </div>
          <div class="card px-1 py-3">
            <dd class="tabular font-display text-xl font-bold">{{ totals.thisMonth }}</dd>
            <dt class="mt-0.5 text-[11px] text-ink-400">deze maand</dt>
          </div>
          <div class="card px-1 py-3">
            <dd class="tabular font-display text-xl font-bold">{{ totals.weekStreak }}</dd>
            <dt class="mt-0.5 text-[11px] text-ink-400">weken op rij</dt>
          </div>
          <div class="card px-1 py-3">
            <dd class="tabular font-display text-xl font-bold">{{ totals.total }}</dd>
            <dt class="mt-0.5 text-[11px] text-ink-400">totaal</dt>
          </div>
        </dl>

        <section class="card mt-3 p-4">
          <div class="mb-3 flex items-baseline justify-between gap-3">
            <h2 class="text-base font-semibold">Trainingsdagen</h2>
            <p class="text-xs text-ink-400">laatste {{ CALENDAR_WEEKS }} weken</p>
          </div>
          <TrainingCalendar :grid="grid" :today="today" />
        </section>

        <section class="card mt-3 p-4">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-base font-semibold">Volume per week</h2>
            <p class="text-xs text-ink-400">gewicht × reps</p>
          </div>
          <p class="tabular mt-2 font-display text-2xl font-bold" aria-live="polite">
            {{ formatKg(week.volume) }}
            <span class="ml-1 text-xs font-normal text-ink-400">
              week van {{ formatShortDate(week.weekStart) }} ·
              {{ week.sessions }} {{ week.sessions === 1 ? 'training' : 'trainingen' }}
            </span>
          </p>
          <WeekBars v-model:selected="selectedWeek" class="mt-3" :weeks="weeks" />
        </section>

        <section v-if="bodyPoint" class="card mt-3 p-4">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-base font-semibold">Lichaamsgewicht</h2>
            <p v-if="bodyDiff" class="tabular text-xs text-ink-400">{{ bodyDiff }}</p>
          </div>
          <p class="tabular mt-2 font-display text-2xl font-bold" aria-live="polite">
            {{ formatWeight(bodyPoint.weight) }}
            <span class="ml-1 text-xs font-normal text-ink-400">
              {{ formatDay(bodyPoint.at).toLowerCase() }}
            </span>
          </p>
          <LineChart
            v-model:selected="selectedBody"
            class="mt-2"
            :values="body.map((b) => b.weight)"
            :format="formatWeight"
            :label="`Lichaamsgewicht: van ${formatWeight(body[0].weight)} naar ${formatWeight(body[body.length - 1].weight)} in ${body.length} metingen`"
          />
        </section>

        <section v-if="health.length" class="card mt-3 p-4">
          <h2 class="text-base font-semibold">Aandachtspunten</h2>
          <ul class="mt-2 space-y-2 text-sm">
            <li v-for="h in health" :key="h.name">
              <span class="font-semibold">{{ h.name }}</span>
              <span class="tabular block text-xs text-ink-400">{{ healthText(h) }}</span>
            </li>
          </ul>
        </section>

        <section v-if="records.length" class="card mt-3 p-4">
          <h2 class="text-base font-semibold">Persoonlijke records</h2>
          <table class="tabular mt-2 w-full text-sm">
            <thead>
              <tr class="text-xs text-ink-400">
                <th class="w-full pb-1 text-left font-normal">Oefening</th>
                <th class="pb-1 text-right font-normal">Zwaarst</th>
                <th class="pb-1 text-right font-normal">1RM</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in records" :key="r.name" class="border-t border-ink-600/60">
                <td class="max-w-0 truncate py-2 pr-2">{{ r.name }}</td>
                <td class="py-2 text-right font-semibold whitespace-nowrap">
                  {{ formatWeight(r.maxWeight) }}
                </td>
                <td class="py-2 pl-3 text-right whitespace-nowrap text-ink-400">
                  {{ formatWeight(r.maxE1RM) }}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </template>
  </main>
</template>
