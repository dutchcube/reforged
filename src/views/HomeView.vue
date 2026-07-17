<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import WorkoutCard from '@/components/WorkoutCard.vue'
import { formatDay, formatWeight } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useSessionStore } from '@/stores/session'
import { useWorkoutsStore } from '@/stores/workouts'

const auth = useAuthStore()
const store = useWorkoutsStore()
const session = useSessionStore()

onMounted(() => {
  store.fetchWorkouts()
  store.fetchRecentSessions()
})
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Workouts</h1>
        <p class="text-xs text-ink-400">{{ auth.user?.email }}</p>
      </div>
      <button type="button" class="text-xs text-ink-400 hover:text-ink-100" @click="auth.signOut()">
        Uitloggen
      </button>
    </header>

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
      <span class="text-volt-500">→</span>
    </RouterLink>

    <p v-if="store.error" class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500">
      {{ store.error }}
    </p>

    <div v-if="store.loading && !store.workouts.length" class="space-y-3">
      <div v-for="i in 2" :key="i" class="card h-28 animate-pulse opacity-50" />
    </div>

    <div v-else-if="store.workouts.length" class="space-y-3">
      <WorkoutCard v-for="w in store.workouts" :key="w.id" :workout="w" />
    </div>

    <div v-else class="card p-8 text-center">
      <p class="font-display text-lg font-semibold">Nog geen workouts</p>
      <p class="mt-1 text-sm text-ink-400">Maak je eerste en begin met tikken.</p>
    </div>

    <!-- Historie -->
    <section v-if="store.recentSessions.length" class="mt-8">
      <h2 class="mb-3 text-sm font-semibold tracking-wide text-ink-400 uppercase">
        Laatst voltooid
      </h2>
      <div class="space-y-3">
        <article v-for="s in store.recentSessions" :key="s.id" class="card p-4">
          <header class="mb-2 flex items-baseline justify-between gap-3">
            <h3 class="truncate font-semibold">{{ s.workout_name }}</h3>
            <p class="shrink-0 text-xs text-ink-400">{{ formatDay(s.completed_at) }}</p>
          </header>
          <ul class="space-y-1">
            <li
              v-for="se in s.session_exercises ?? []"
              :key="se.id"
              class="flex justify-between gap-3 text-sm"
            >
              <span class="truncate text-ink-400">{{ se.exercise_name }}</span>
              <span class="tabular shrink-0">
                {{ se.reps_done.join('/') }}
                <span v-if="se.weight !== null" class="text-ink-400">
                  · {{ formatWeight(se.weight) }}
                </span>
              </span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <!-- Duimzone: knop onderin -->
    <div
      class="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] bg-gradient-to-t from-ink-900 via-ink-900 to-transparent p-4 pt-8"
    >
      <RouterLink :to="{ name: 'edit' }" class="btn-primary w-full">+ Nieuwe workout</RouterLink>
    </div>
  </main>
</template>
