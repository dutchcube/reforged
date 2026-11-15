<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExerciseEditRow from '@/components/ExerciseEditRow.vue'
import { useWorkoutsStore } from '@/stores/workouts'
import type { ExerciseDraft } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const store = useWorkoutsStore()

const workoutId = (route.params.workoutId as string | undefined) || null
const isNew = computed(() => workoutId === null)

const name = ref('')
const exercises = ref<ExerciseDraft[]>([])
const loading = ref(!isNew.value)
const saving = ref(false)

onMounted(async () => {
  if (!workoutId) {
    addExercise()
    return
  }
  const workout = await store.fetchWorkout(workoutId)
  if (workout) {
    name.value = workout.name
    exercises.value = (workout.exercises ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight === null ? null : Number(e.weight),
      increment: Number(e.increment),
    }))
  }
  if (!exercises.value.length) addExercise()
  loading.value = false
})

function addExercise() {
  // increment leeg = standaardstap (deadlift 5 kg, de rest 2,5 kg)
  exercises.value.push({ name: '', sets: 5, reps: 5, weight: null, increment: null })
}

/** Een leeggemaakt getalveld levert '' of NaN op; dat moet NULL worden, geen 0. */
function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= exercises.value.length) return
  const [item] = exercises.value.splice(index, 1)
  exercises.value.splice(target, 0, item)
}

/** Lege regels tellen niet mee — je mag een rij open laten staan zonder opslag te blokkeren. */
const filled = computed(() => exercises.value.filter((e) => e.name.trim().length > 0))
const canSave = computed(() => name.value.trim().length > 0 && filled.value.length > 0)

async function save() {
  if (!canSave.value) return
  saving.value = true
  const cleaned = filled.value.map((e) => ({
    ...e,
    name: e.name.trim(),
    sets: Math.min(20, Math.max(1, Math.round(e.sets || 1))),
    reps: Math.min(100, Math.max(1, Math.round(e.reps || 1))),
    weight: numberOrNull(e.weight),
    increment: numberOrNull(e.increment),
  }))
  const id = await store.saveWorkout(workoutId, name.value.trim(), cleaned)
  saving.value = false
  if (id) router.replace({ name: 'programs' })
}

async function remove() {
  if (!workoutId) return
  if (!confirm(`"${name.value}" verwijderen? Je historie blijft bewaard.`)) return
  const ok = await store.deleteWorkout(workoutId)
  if (ok) router.replace({ name: 'programs' })
}
</script>

<template>
  <main class="px-4 pt-4 pb-28">
    <header class="mb-5 flex items-center justify-between gap-3">
      <button
        type="button"
        class="text-sm text-ink-400 hover:text-ink-100"
        @click="router.back()"
      >
        ← Terug
      </button>
      <h1 class="font-display text-sm font-semibold tracking-wide uppercase">
        {{ isNew ? 'Nieuwe workout' : 'Bewerken' }}
      </h1>
      <button
        v-if="!isNew"
        type="button"
        class="text-sm text-danger-500 hover:underline"
        @click="remove"
      >
        Verwijder
      </button>
      <span v-else class="w-14" aria-hidden="true" />
    </header>

    <p v-if="loading" class="py-16 text-center text-sm text-ink-400">Laden…</p>

    <template v-else>
      <label class="mb-5 block">
        <span class="mb-1 block text-xs text-ink-400">Naam</span>
        <input
          v-model="name"
          class="input font-display text-lg"
          placeholder="Workout A"
          maxlength="60"
        />
      </label>

      <h2 class="mb-2 text-xs font-semibold tracking-wide text-ink-400 uppercase">Oefeningen</h2>
      <div class="space-y-3">
        <ExerciseEditRow
          v-for="(ex, i) in exercises"
          :key="i"
          :exercise="ex"
          :index="i"
          :total="exercises.length"
          @move="(d) => move(i, d)"
          @remove="exercises.splice(i, 1)"
        />
      </div>

      <button type="button" class="btn-ghost mt-3 w-full" @click="addExercise">
        + Oefening toevoegen
      </button>

      <p class="mt-3 text-xs leading-relaxed text-ink-400">
        Stap = zoveel kg erbij na een sessie waarin je alle sets haalt. Laat het veld leeg voor de
        standaard. Vul 0 in voor een accessoire-oefening (bijv. curls 3×10): het gewicht verandert
        dan nooit vanzelf en er volgt ook geen deload.
      </p>

      <p v-if="store.error" class="mt-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500">
        {{ store.error }}
      </p>
    </template>

    <div
      class="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] bg-gradient-to-t from-ink-900 via-ink-900 to-transparent p-4 pt-8"
    >
      <button type="button" class="btn-primary w-full" :disabled="!canSave || saving" @click="save">
        {{ saving ? 'Opslaan…' : 'Opslaan' }}
      </button>
    </div>
  </main>
</template>
