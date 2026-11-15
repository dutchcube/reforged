<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import ExerciseRunRow from '@/components/ExerciseRunRow.vue'
import RestTimer from '@/components/RestTimer.vue'
import { formatWeight } from '@/lib/format'
import { warmupSets } from '@/lib/warmup'
import { useHistoryStore } from '@/stores/history'
import { useRestTimerStore } from '@/stores/restTimer'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutsStore } from '@/stores/workouts'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const workouts = useWorkoutsStore()
const history = useHistoryStore()
const settings = useSettingsStore()
const timer = useRestTimerStore()

const workoutId = route.params.workoutId as string
const loading = ref(true)
const notFound = ref(false)
/** Zet Finish/verlaten door: onderdrukt de "weet je het zeker"-guard. */
const leaving = ref(false)
const tab = ref<'workout' | 'warmup'>('workout')

const active = computed(() => session.active)
const progress = computed(() =>
  session.totalSets ? session.completedSets / session.totalSets : 0,
)

/** Opwarmsets per oefening, op basis van het gewicht in deze sessie. */
const warmups = computed(() =>
  (active.value?.exercises ?? []).map((ex) => ({
    name: ex.name,
    weight: ex.weight,
    sets: warmupSets(ex.weight, settings.barWeight),
  })),
)

onMounted(async () => {
  // Loopt deze sessie al (refresh, terug uit Home)? Dan direct verder, ook offline.
  if (session.active?.workoutId === workoutId) {
    loading.value = false
    return
  }

  // Er loopt een sessie van een andere workout: niet stilletjes overschrijven.
  if (session.conflictsWith(workoutId) && session.active) {
    const running = session.active
    const replace = confirm(
      `Er loopt nog een sessie van "${running.workoutName}". Die afbreken en deze workout starten?`,
    )
    if (!replace) {
      leaving.value = true
      if (running.workoutId) router.replace({ name: 'run', params: { workoutId: running.workoutId } })
      else router.replace({ name: 'home' })
      return
    }
  }

  const workout = await workouts.fetchWorkout(workoutId)
  if (!workout) {
    notFound.value = true
    loading.value = false
    return
  }

  // Lichaamsgewicht van de vorige keer als voorzet; mislukt het ophalen, dan blijft het leeg.
  if (!history.loaded) await history.fetchSessions()

  session.start(workout, history.lastBodyWeight)
  timer.reset()
  loading.value = false
})

function tap(exerciseIndex: number, setIndex: number) {
  const before = session.active?.exercises[exerciseIndex]?.values[setIndex] ?? null
  const after = session.tapSet(exerciseIndex, setIndex)
  // Alleen de eerste tik op een set start de rust; bijstellen van reps niet.
  if (settings.autoStartRest && before === null && after !== null) timer.start()
}

async function finish() {
  if (session.completedSets < session.totalSets) {
    const open = session.totalSets - session.completedSets
    const label = open === 1 ? '1 set is' : `${open} sets zijn`
    if (!confirm(`${label} nog niet afgetikt en tellen als 0 reps. Toch afronden?`)) return
  }
  const ok = await session.finish()
  if (!ok) return
  leaving.value = true
  timer.stop()
  // De progressie heeft de gewichten aangepast: lijst en historie verversen.
  await Promise.all([workouts.fetchWorkouts(), history.fetchSessions()])
  router.replace({ name: 'home' })
}

function quit() {
  if (!confirm('Sessie afbreken? De afgetikte sets gaan verloren.')) return
  session.discard()
  timer.stop()
  leaving.value = true
  router.replace({ name: 'home' })
}

onBeforeRouteLeave(() => {
  if (leaving.value || !session.isRunning) return true
  return confirm('Sessie loopt nog. Toch weggaan? De voortgang blijft bewaard.')
})
</script>

<template>
  <main class="px-4 pt-4 pb-44">
    <header class="mb-4 flex items-center justify-between gap-3">
      <button type="button" class="text-sm text-ink-400 hover:text-ink-100" @click="quit">
        ✕ Stop
      </button>
      <button
        type="button"
        class="btn-primary px-5 py-2"
        :disabled="session.saving || !active"
        @click="finish"
      >
        {{ session.saving ? 'Opslaan…' : 'Afronden' }}
      </button>
    </header>

    <p v-if="loading" class="py-16 text-center text-sm text-ink-400">Laden…</p>

    <p v-else-if="notFound" class="card p-8 text-center">
      Deze workout bestaat niet (meer).
      <RouterLink :to="{ name: 'home' }" class="mt-3 block text-volt-500">Terug naar Start</RouterLink>
    </p>

    <template v-else-if="active">
      <div class="mb-4">
        <h1 class="text-2xl font-bold">{{ active.workoutName }}</h1>
        <div class="mt-2 flex items-center gap-3">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
            <div
              class="h-full rounded-full bg-volt-500 transition-[width] duration-300"
              :style="{ width: `${progress * 100}%` }"
            />
          </div>
          <p class="tabular text-xs text-ink-400">
            {{ session.completedSets }}/{{ session.totalSets }}
          </p>
        </div>
      </div>

      <!-- Workout / Opwarming -->
      <div class="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink-800 p-1" role="tablist">
        <button
          v-for="t in [
            { key: 'workout', label: 'Workout' },
            { key: 'warmup', label: 'Opwarming' },
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

      <p
        v-if="session.error"
        class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500"
        role="alert"
      >
        {{ session.error }}
      </p>

      <!-- Tab: Workout -->
      <div v-show="tab === 'workout'" class="space-y-3">
        <ExerciseRunRow
          v-for="(ex, i) in active.exercises"
          :key="i"
          :name="ex.name"
          :target-sets="ex.target_sets"
          :target-reps="ex.target_reps"
          :weight="ex.weight"
          :values="ex.values"
          @tap="(setIndex) => tap(i, setIndex)"
          @adjust="(delta) => session.adjustWeight(i, delta)"
        />

        <p v-if="!active.exercises.length" class="card p-8 text-center text-sm text-ink-400">
          Deze workout heeft nog geen oefeningen.
        </p>

        <section class="card space-y-3 p-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm">Lichaamsgewicht (kg)</span>
            <input
              v-model.number="active.bodyWeight"
              type="number"
              inputmode="decimal"
              min="1"
              step="0.1"
              placeholder="—"
              class="input tabular w-24 text-right"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm">Notitie</span>
            <textarea
              v-model="active.note"
              rows="2"
              maxlength="500"
              class="input resize-none"
              placeholder="Hoe ging het?"
            />
          </label>
        </section>
      </div>

      <!-- Tab: Opwarming -->
      <div v-show="tab === 'warmup'" class="space-y-3">
        <section v-for="w in warmups" :key="w.name" class="card p-4">
          <header class="mb-2 flex items-baseline justify-between gap-3">
            <h2 class="truncate text-base font-semibold">{{ w.name }}</h2>
            <p v-if="w.weight !== null" class="tabular shrink-0 text-xs text-ink-400">
              werkgewicht {{ formatWeight(w.weight) }}
            </p>
          </header>
          <ul v-if="w.sets.length" class="space-y-1">
            <li
              v-for="(s, i) in w.sets"
              :key="i"
              class="tabular flex justify-between gap-3 text-sm"
            >
              <span class="text-ink-400">{{ s.sets }}×{{ s.reps }}</span>
              <span>{{ formatWeight(s.weight) }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-ink-400">
            {{
              w.weight === null
                ? 'Geen gewicht ingesteld.'
                : 'Zo licht dat opwarmen met de lege stang volstaat.'
            }}
          </p>
        </section>
      </div>
    </template>

    <!-- Duimzone: rusttimer altijd binnen bereik -->
    <div
      class="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] bg-gradient-to-t from-ink-900 via-ink-900 to-transparent p-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <RestTimer />
    </div>
  </main>
</template>
