import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ExerciseDraft, Session, Workout } from '@/lib/types'

export const useWorkoutsStore = defineStore('workouts', () => {
  const workouts = ref<Workout[]>([])
  const recentSessions = ref<Session[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWorkouts() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .order('position', { ascending: true })
      .order('position', { referencedTable: 'exercises', ascending: true })

    if (err) error.value = err.message
    else workouts.value = (data as Workout[]) ?? []
    loading.value = false
  }

  async function fetchRecentSessions(limit = 5) {
    const { data, error: err } = await supabase
      .from('sessions')
      .select('*, session_exercises(*)')
      .order('completed_at', { ascending: false })
      .order('position', { referencedTable: 'session_exercises', ascending: true })
      .limit(limit)

    if (err) error.value = err.message
    else recentSessions.value = (data as Session[]) ?? []
  }

  function getWorkout(id: string) {
    return workouts.value.find((w) => w.id === id) ?? null
  }

  /** Haalt één workout op, ook als de lijst nog niet geladen is (deeplink/refresh). */
  async function fetchWorkout(id: string): Promise<Workout | null> {
    const cached = getWorkout(id)
    if (cached) return cached

    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('id', id)
      .order('position', { referencedTable: 'exercises', ascending: true })
      .single()

    if (err) {
      error.value = err.message
      return null
    }
    return data as Workout
  }

  /**
   * Slaat naam + oefeningen op. Oefeningen worden vervangen (delete + insert)
   * in plaats van gediffed: eenvoudiger, en de sessie-historie hangt aan
   * snapshots, dus er gaat niets verloren.
   */
  async function saveWorkout(
    id: string | null,
    name: string,
    exercises: ExerciseDraft[],
  ): Promise<string | null> {
    error.value = null
    let workoutId = id

    if (workoutId) {
      const { error: err } = await supabase.from('workouts').update({ name }).eq('id', workoutId)
      if (err) {
        error.value = err.message
        return null
      }
      const { error: delErr } = await supabase.from('exercises').delete().eq('workout_id', workoutId)
      if (delErr) {
        error.value = delErr.message
        return null
      }
    } else {
      const position = workouts.value.length
      const { data, error: err } = await supabase
        .from('workouts')
        .insert({ name, position })
        .select('id')
        .single()
      if (err || !data) {
        error.value = err?.message ?? 'Opslaan mislukt'
        return null
      }
      workoutId = data.id as string
    }

    if (exercises.length) {
      const rows = exercises.map((e, i) => ({
        workout_id: workoutId,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        position: i,
      }))
      const { error: err } = await supabase.from('exercises').insert(rows)
      if (err) {
        error.value = err.message
        return null
      }
    }

    await fetchWorkouts()
    return workoutId
  }

  async function deleteWorkout(id: string) {
    error.value = null
    const { error: err } = await supabase.from('workouts').delete().eq('id', id)
    if (err) {
      error.value = err.message
      return false
    }
    workouts.value = workouts.value.filter((w) => w.id !== id)
    return true
  }

  return {
    workouts,
    recentSessions,
    loading,
    error,
    fetchWorkouts,
    fetchRecentSessions,
    fetchWorkout,
    getWorkout,
    saveWorkout,
    deleteWorkout,
  }
})
