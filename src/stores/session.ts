import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { nextSetValue, type SetValue } from '@/lib/setCircle'
import type { Workout } from '@/lib/types'

export { nextSetValue, type SetValue }

interface ActiveExercise {
  name: string
  target_sets: number
  target_reps: number
  weight: number | null
  values: SetValue[]
}

interface ActiveSession {
  workoutId: string | null
  workoutName: string
  startedAt: string
  exercises: ActiveExercise[]
}

const STORAGE_KEY = 'workout-app:active-session'

function load(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ActiveSession) : null
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  // Spiegel in localStorage: een refresh of dichtgeklapte telefoon wist de voortgang niet.
  const active = ref<ActiveSession | null>(load())
  const saving = ref(false)
  const error = ref<string | null>(null)

  watch(
    active,
    (val) => {
      if (val) localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      else localStorage.removeItem(STORAGE_KEY)
    },
    { deep: true },
  )

  const isRunning = computed(() => active.value !== null)

  /** Aantal aangetikte sets over de hele sessie — voor de voortgangsbalk. */
  const completedSets = computed(
    () =>
      active.value?.exercises.reduce(
        (sum, ex) => sum + ex.values.filter((v) => v !== null).length,
        0,
      ) ?? 0,
  )

  const totalSets = computed(
    () => active.value?.exercises.reduce((sum, ex) => sum + ex.target_sets, 0) ?? 0,
  )

  function start(workout: Workout) {
    active.value = {
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: new Date().toISOString(),
      exercises: (workout.exercises ?? []).map((e) => ({
        name: e.name,
        target_sets: e.sets,
        target_reps: e.reps,
        weight: e.weight,
        values: Array.from({ length: e.sets }, () => null as SetValue),
      })),
    }
  }

  /** Hervat een lopende sessie voor deze workout, of start een nieuwe. */
  function startOrResume(workout: Workout) {
    if (active.value?.workoutId === workout.id) return
    start(workout)
  }

  function tapSet(exerciseIndex: number, setIndex: number) {
    const ex = active.value?.exercises[exerciseIndex]
    if (!ex) return
    ex.values[setIndex] = nextSetValue(ex.values[setIndex], ex.target_reps)
  }

  function discard() {
    active.value = null
  }

  async function finish(): Promise<boolean> {
    if (!active.value) return false
    saving.value = true
    error.value = null

    const { workoutId, workoutName, startedAt, exercises } = active.value

    const { data, error: err } = await supabase
      .from('sessions')
      .insert({
        workout_id: workoutId,
        workout_name: workoutName,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (err || !data) {
      error.value = err?.message ?? 'Opslaan mislukt'
      saving.value = false
      return false
    }

    const rows = exercises.map((ex, i) => ({
      session_id: data.id,
      exercise_name: ex.name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      weight: ex.weight,
      // pending (null) telt als 0 gehaalde reps
      reps_done: ex.values.map((v) => v ?? 0),
      position: i,
    }))

    if (rows.length) {
      const { error: exErr } = await supabase.from('session_exercises').insert(rows)
      if (exErr) {
        // Sessie zonder oefeningen is nutteloos: opruimen zodat Home niet vervuilt.
        await supabase.from('sessions').delete().eq('id', data.id)
        error.value = exErr.message
        saving.value = false
        return false
      }
    }

    active.value = null
    saving.value = false
    return true
  }

  return {
    active,
    saving,
    error,
    isRunning,
    completedSets,
    totalSets,
    start,
    startOrResume,
    tapSet,
    discard,
    finish,
  }
})
