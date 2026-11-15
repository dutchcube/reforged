import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { durationMinutes } from '@/lib/format'
import { nextProgression, PLATE_STEP, type ProgressionOutcome } from '@/lib/progression'
import { nextSetValue, type SetValue } from '@/lib/setCircle'
import { exerciseVolume } from '@/lib/stats'
import { isNetworkError, readJson, writeJson } from '@/lib/storage'
import type { Session, Workout } from '@/lib/types'
import { useHistoryStore } from './history'
import { useWorkoutsStore } from './workouts'

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
  /** Vaste id: een herhaalde poging om op te slaan levert zo nooit een dubbele sessie op. */
  id?: string
  workoutId: string | null
  workoutName: string
  startedAt: string
  bodyWeight: number | null
  note: string
  exercises: ActiveExercise[]
}

/** Wat er naar de RPC finish_session gaat. */
interface SessionPayload {
  id: string
  workout_id: string | null
  workout_name: string
  started_at: string
  completed_at: string
  body_weight: number | null
  note: string
  exercises: Array<{
    exercise_id: string | null
    exercise_name: string
    target_sets: number
    target_reps: number
    weight: number | null
    reps_done: number[]
    next_weight: number | null
    next_fail_count: number
  }>
}

export type FinishResult = 'saved' | 'queued' | 'failed'

/** Samenvatting van de laatst afgeronde sessie, voor het "Klaar"-scherm. */
export interface SessionSummary {
  workoutName: string
  minutes: number
  volume: number
  /** True als de sessie nog op verbinding wacht. */
  queued: boolean
  exercises: Array<{
    name: string
    weight: number | null
    targetReps: number
    repsDone: number[]
    outcome: ProgressionOutcome
    nextWeight: number | null
  }>
}

const STORAGE_KEY = 'reforged:active-session'
const PENDING_KEY = 'reforged:pending-sessions'

function newId(): string {
  return crypto.randomUUID()
}

export const useSessionStore = defineStore('session', () => {
  // Spiegel in localStorage: een refresh of dichtgeklapte telefoon wist de voortgang niet.
  const active = ref<ActiveSession | null>(readJson<ActiveSession | null>(STORAGE_KEY, null))
  /** Afgeronde sessies die nog naar de server moeten (offline afgerond). */
  const pending = ref<SessionPayload[]>(readJson<SessionPayload[]>(PENDING_KEY, []))
  const saving = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const lastSummary = ref<SessionSummary | null>(null)

  watch(
    active,
    (val) => {
      if (val) localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      else localStorage.removeItem(STORAGE_KEY)
    },
    { deep: true },
  )

  const isRunning = computed(() => active.value !== null)
  const pendingCount = computed(() => pending.value.length)

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
      id: newId(),
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

  function savePending() {
    writeJson(PENDING_KEY, pending.value)
  }

  /** De sessie zoals de historie hem toont, zolang hij nog niet op de server staat. */
  function toLocalSession(p: SessionPayload): Session {
    return {
      id: p.id,
      user_id: '',
      workout_id: p.workout_id,
      workout_name: p.workout_name,
      started_at: p.started_at,
      completed_at: p.completed_at,
      body_weight: p.body_weight,
      note: p.note.trim() || null,
      session_exercises: p.exercises.map((e, i) => ({
        id: `${p.id}-${i}`,
        session_id: p.id,
        user_id: '',
        exercise_name: e.exercise_name,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        weight: e.weight,
        reps_done: e.reps_done,
        position: i,
      })),
    }
  }

  /**
   * Slaat de sessie op en past de progressie toe, in één transactie
   * (RPC finish_session). Zonder verbinding gaat de sessie in een wachtrij
   * die vanzelf wordt verstuurd; bij een andere fout blijft hij open staan.
   */
  async function finish(): Promise<FinishResult> {
    if (!active.value) return 'failed'
    saving.value = true
    error.value = null

    // Sessies van vóór deze versie hebben nog geen id.
    if (!active.value.id) active.value.id = newId()
    const { id, workoutId, workoutName, startedAt, bodyWeight, note, exercises } = active.value

    const progressions = exercises.map((ex) =>
      nextProgression({
        weight: ex.weight,
        increment: ex.increment,
        failCount: ex.failCount,
        targetReps: ex.target_reps,
        repsDone: ex.values,
      }),
    )

    const payload: SessionPayload = {
      id,
      workout_id: workoutId,
      workout_name: workoutName,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      body_weight: bodyWeight !== null && Number.isFinite(bodyWeight) && bodyWeight > 0 ? bodyWeight : null,
      note,
      exercises: exercises.map((ex, i) => ({
        exercise_id: ex.exerciseId,
        exercise_name: ex.name,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        weight: ex.weight,
        // pending (null) telt als 0 gehaalde reps
        reps_done: ex.values.map((v) => v ?? 0),
        // 'none' = overgeslagen, zonder gewicht of accessoire: de oefening blijft ongewijzigd
        next_weight: progressions[i].outcome === 'none' ? null : progressions[i].weight,
        next_fail_count: progressions[i].failCount,
      })),
    }

    const { error: err } = await supabase.rpc('finish_session', { p_session: payload })
    saving.value = false

    // 23505 = deze id staat er al: een eerdere poging is toch aangekomen.
    const alreadySaved = err?.code === '23505'
    let queued = false

    if (err && !alreadySaved) {
      if (!isNetworkError(err.message)) {
        error.value = `Opslaan mislukt: ${err.message}. Je sets staan nog op dit toestel; probeer het opnieuw.`
        return 'failed'
      }
      queued = true
      pending.value.push(payload)
      savePending()
      // Laat de app alvast doen alsof het is opgeslagen: historie en gewichten kloppen offline.
      useHistoryStore().addLocal(toLocalSession(payload))
      useWorkoutsStore().applyProgression(
        payload.exercises
          .filter((e) => e.next_weight !== null)
          .map((e) => ({
            exerciseId: e.exercise_id,
            weight: e.next_weight,
            failCount: e.next_fail_count,
          })),
      )
    }

    lastSummary.value = {
      workoutName,
      minutes: durationMinutes(payload.started_at, payload.completed_at),
      volume: Math.round(
        payload.exercises.reduce((sum, e) => sum + exerciseVolume(e.weight, e.reps_done), 0),
      ),
      queued,
      exercises: payload.exercises.map((e, i) => ({
        name: e.exercise_name,
        weight: e.weight,
        targetReps: e.target_reps,
        repsDone: e.reps_done,
        outcome: progressions[i].outcome,
        nextWeight: progressions[i].weight,
      })),
    }

    active.value = null
    return queued ? 'queued' : 'saved'
  }

  /**
   * Verstuurt de wachtrij met offline afgeronde sessies, oudste eerst.
   * Geeft terug hoeveel er zijn aangekomen.
   */
  async function flushPending(): Promise<number> {
    if (syncing.value || !pending.value.length) return 0
    syncing.value = true
    let sent = 0

    for (const payload of [...pending.value]) {
      const { error: err } = await supabase.rpc('finish_session', { p_session: payload })

      if (err && err.code !== '23505') {
        // Geen verbinding: later opnieuw. Een andere fout melden we, de sessie blijft bewaard.
        if (!isNetworkError(err.message)) {
          error.value = `Synchroniseren mislukt: ${err.message}. De sessie blijft op dit toestel bewaard.`
        }
        break
      }

      pending.value = pending.value.filter((p) => p.id !== payload.id)
      savePending()
      useHistoryStore().removeLocal(payload.id)
      sent++
    }

    syncing.value = false
    return sent
  }

  return {
    active,
    pending,
    pendingCount,
    saving,
    syncing,
    error,
    lastSummary,
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
    flushPending,
  }
})
