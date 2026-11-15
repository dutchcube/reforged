<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import SessionCard from '@/components/SessionCard.vue'
import { formatTarget, formatTime } from '@/lib/format'
import { estimateMinutes, nextWorkout } from '@/lib/schedule'
import { useHistoryStore } from '@/stores/history'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutsStore } from '@/stores/workouts'

const store = useWorkoutsStore()
const history = useHistoryStore()
const session = useSessionStore()
const settings = useSettingsStore()

onMounted(() => {
  store.fetchWorkouts()
  history.fetchSessions()
})

/** De workout die nu aan de beurt is (A -> B -> A ...). */
const upNext = computed(() => nextWorkout(store.workouts, history.lastWorkoutId))
const upNextExercises = computed(() => upNext.value?.exercises ?? [])

const estimate = computed(() => {
  const minutes = estimateMinutes(upNextExercises.value, settings.restSeconds)
  if (!minutes) return ''
  const end = new Date(Date.now() + minutes * 60_000)
  return `Klaar in ±${minutes} min, rond ${formatTime(end)}`
})

const recent = computed(() => history.sessions.slice(0, 3))
const firstLoad = computed(
  () => (store.loading && !store.loaded) || (history.loading && !history.loaded),
)
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-6">
      <h1 class="text-2xl font-bold">Reforged</h1>
      <p class="text-xs text-ink-400">Tik je sets af. De rest rekent de app uit.</p>
    </header>

    <p
      v-if="store.error || history.error"
      class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500"
    >
      {{ store.error || history.error }}
    </p>

    <!-- Lopende sessie hervatten -->
    <RouterLink
      v-if="session.isRunning && session.active?.workoutId"
      :to="{ name: 'run', params: { workoutId: session.active.workoutId } }"
      class="mb-4 flex items-center justify-between gap-3 rounded-card border border-volt-500/50 bg-volt-500/10 p-4"
    >
      <div>
        <p class="font-display text-sm font-semibold text-volt-500">Sessie bezig</p>
        <p class="tabular text-xs text-ink-400">
          {{ session.active.workoutName }} · {{ session.completedSets }}/{{ session.totalSets }} sets
        </p>
      </div>
      <span class="font-display text-sm font-semibold text-volt-500">Hervat →</span>
    </RouterLink>

    <div v-if="firstLoad" class="space-y-3">
      <div class="card h-44 animate-pulse opacity-50" />
      <div class="card h-28 animate-pulse opacity-50" />
    </div>

    <template v-else>
      <!-- Volgende workout -->
      <section v-if="upNext" class="card p-4">
        <p class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Nu aan de beurt</p>
        <h2 class="mt-1 truncate text-xl font-bold">{{ upNext.name }}</h2>

        <ul v-if="upNextExercises.length" class="mt-3 space-y-1.5">
          <li
            v-for="e in upNextExercises"
            :key="e.id"
            class="flex justify-between gap-3 text-sm"
          >
            <span class="truncate">{{ e.name }}</span>
            <span class="tabular shrink-0 text-ink-400">
              {{ formatTarget(e.sets, e.reps, e.weight) }}
            </span>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-ink-400">Deze workout heeft nog geen oefeningen.</p>

        <RouterLink
          :to="{ name: 'run', params: { workoutId: upNext.id } }"
          class="btn-primary mt-4 w-full"
        >
          Start workout
        </RouterLink>
        <p v-if="estimate" class="tabular mt-2 text-center text-xs text-ink-400">{{ estimate }}</p>

        <RouterLink
          v-if="store.workouts.length > 1"
          :to="{ name: 'programs' }"
          class="mt-3 block text-center text-xs text-ink-400 underline-offset-2 hover:text-ink-100 hover:underline"
        >
          Andere workout kiezen
        </RouterLink>
      </section>

      <section v-else class="card p-8 text-center">
        <p class="font-display text-lg font-semibold">Nog geen workouts</p>
        <p class="mt-1 text-sm text-ink-400">Maak je eerste workout en begin met tikken.</p>
        <RouterLink :to="{ name: 'edit' }" class="btn-primary mt-5 w-full">+ Nieuwe workout</RouterLink>
      </section>

      <!-- Laatste sessies -->
      <section v-if="recent.length" class="mt-8">
        <div class="mb-3 flex items-baseline justify-between">
          <h2 class="text-sm font-semibold tracking-wide text-ink-400 uppercase">Laatst voltooid</h2>
          <RouterLink :to="{ name: 'history' }" class="text-xs text-ink-400 hover:text-ink-100">
            Alles bekijken
          </RouterLink>
        </div>
        <div class="space-y-3">
          <SessionCard v-for="s in recent" :key="s.id" :session="s" />
        </div>
      </section>
    </template>
  </main>
</template>
