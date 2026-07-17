<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import ExerciseRunRow from '@/components/ExerciseRunRow.vue'
import RestTimer from '@/components/RestTimer.vue'
import { useSessionStore } from '@/stores/session'
import { useWorkoutsStore } from '@/stores/workouts'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const workouts = useWorkoutsStore()

const workoutId = route.params.workoutId as string
const loading = ref(true)
const notFound = ref(false)
/** Zet Finish/verlaten door: onderdrukt de "weet je het zeker"-guard. */
const leaving = ref(false)

const active = computed(() => session.active)
const progress = computed(() =>
  session.totalSets ? session.completedSets / session.totalSets : 0,
)

onMounted(async () => {
  const workout = await workouts.fetchWorkout(workoutId)
  if (!workout) {
    notFound.value = true
    loading.value = false
    return
  }
  session.startOrResume(workout)
  loading.value = false
})

async function finish() {
  const ok = await session.finish()
  if (!ok) return
  leaving.value = true
  await workouts.fetchRecentSessions()
  router.replace({ name: 'home' })
}

function quit() {
  if (!confirm('Sessie afbreken? De afgetikte sets gaan verloren.')) return
  session.discard()
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
        {{ session.saving ? 'Opslaan…' : 'Finish' }}
      </button>
    </header>

    <p v-if="loading" class="py-16 text-center text-sm text-ink-400">Laden…</p>

    <p v-else-if="notFound" class="card p-8 text-center">
      Deze workout bestaat niet (meer).
      <RouterLink :to="{ name: 'home' }" class="mt-3 block text-volt-500">Terug naar Home</RouterLink>
    </p>

    <template v-else-if="active">
      <div class="mb-5">
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

      <p
        v-if="session.error"
        class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500"
      >
        {{ session.error }}
      </p>

      <div class="space-y-3">
        <ExerciseRunRow
          v-for="(ex, i) in active.exercises"
          :key="i"
          :name="ex.name"
          :target-sets="ex.target_sets"
          :target-reps="ex.target_reps"
          :weight="ex.weight"
          :values="ex.values"
          @tap="(setIndex) => session.tapSet(i, setIndex)"
        />
      </div>

      <p v-if="!active.exercises.length" class="card p-8 text-center text-sm text-ink-400">
        Deze workout heeft nog geen oefeningen.
      </p>
    </template>

    <!-- Duimzone: rusttimer altijd binnen bereik -->
    <div
      class="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] bg-gradient-to-t from-ink-900 via-ink-900 to-transparent p-4 pt-8"
    >
      <RestTimer />
    </div>
  </main>
</template>
