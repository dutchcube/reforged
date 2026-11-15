import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { nextProgression, PLATE_STEP } from '@/lib/progression'
import { nextSetValue, type SetValue } from '@/lib/setCircle'
import type { Workout } from '@/lib/types'

export { nextSetValue, type SetValue }

interface ActiveExercise {
  /** Koppeling naar de oefening in de workout, voor de progressie na afloop. */
  exerciseId: string | null
  name: string
  target_sets: number
  target_reps: number
  weight: number | null
  increment: number
  failCount: number
  values: SetValue[]
}

interface ActiveSession {
  workoutId: string | null
  workoutName: string
  startedAt: string
  bodyWeight: number | null
  note: string
  exercises: ActiveExercise[]
}

const STORAGE_KEY = 'reforged:active-session'

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

  /** True als er een sessie van een ándere workout loopt (starten zou die overschrijven). */
  function conflictsWith(workoutId: string): boolean {
    return active.value !== null && active.value.workoutId !== workoutId
  }

  function start(workout: Workout, bodyWeight: number | null = null) {
    active.value = {
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: new Date().toISOString(),
      bodyWeight,
      note: '',
      exercises: (workout.exercises ?? []).map((e) => ({
        exerciseId: e.id,
        name: e.name,
        target_sets: e.sets,
        target_reps: e.reps,
        weight: e.weight === null ? null : Number(e.weight),
        increment: Number(e.increment ?? PLATE_STEP),
        failCount: e.fail_count ?? 0,
        values: Array.from({ length: e.sets }, () => null as SetValue),
      })),
    }
  }

  /** Hervat een lopende sessie voor deze workout, of start een nieuwe. */
  function startOrResume(workout: Workout, bodyWeight: number | null = null) {
    if (active.value?.workoutId === workout.id) return
    start(workout, bodyWeight)
  }

  /** Tikt een set aan en geeft de nieuwe waarde terug (null = weer onaangetikt). */
  function tapSet(exerciseIndex: number, setIndex: number): SetValue {
    const ex = active.value?.exercises[exerciseIndex]
    if (!ex) return null
    const next = nextSetValue(ex.values[setIndex], ex.target_reps)
    ex.values[setIndex] = next
    return next
  }

  /** Past het gewicht van één oefening aan voor deze sessie (nooit onder 0). */
  function adjustWeight(exerciseIndex: number, delta: number) {
    const ex = active.value?.exercises[exerciseIndex]
    if (!ex || ex.weight === null) return
    ex.weight = Math.max(0, Number((ex.weight + delta).toFixed(2)))
  }

  function discard() {
    active.value = null
  }

  /**
   * Slaat de sessie op en past de progressie toe, in één transactie
   * (RPC finish_session). Mislukt het, dan blijft de sessie lokaal staan.
   */
  async function finish(): Promise<boolean> {
    if (!active.value) return false
    saving.value = true
    error.value = null

    const { workoutId, workoutName, startedAt, bodyWeight, note, exercises } = active.value

    const payload = {
      workout_id: workoutId,
      workout_name: workoutName,
      started_at: startedAt,
      body_weight: bodyWeight !== null && Number.isFinite(bodyWeight) && bodyWeight > 0 ? bodyWeight : null,
      note,
      exercises: exercises.map((ex) => {
        const next = nextProgression({
          weight: ex.weight,
          increment: ex.increment,
          failCount: ex.failCount,
          targetReps: ex.target_reps,
          repsDone: ex.values,
        })
        return {
          exercise_id: ex.exerciseId,
          exercise_name: ex.name,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          weight: ex.weight,
          // pending (null) telt als 0 gehaalde reps
          reps_done: ex.values.map((v) => v ?? 0),
          // 'none' = overgeslagen of zonder gewicht: de oefening blijft ongewijzigd
          next_weight: next.outcome === 'none' ? null : next.weight,
          next_fail_count: next.failCount,
        }
      }),
    }

    const { error: err } = await supabase.rpc('finish_session', { p_session: payload })

    saving.value = false
    if (err) {
      error.value = `Opslaan mislukt: ${err.message}. Je sets staan nog op dit toestel; probeer het opnieuw.`
      return false
    }

    active.value = null
    return true
  }

  return {
    active,
    saving,
    error,
    isRunning,
    completedSets,
    totalSets,
    conflictsWith,
    start,
    startOrResume,
    tapSet,
    adjustWeight,
    discard,
    finish,
  }
})
