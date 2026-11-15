import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { defaultIncrement } from '@/lib/progression'
import type { ExerciseDraft, Workout } from '@/lib/types'

export const useWorkoutsStore = defineStore('workouts', () => {
  const workouts = ref<Workout[]>([])
  const loading = ref(false)
  /** True zodra de lijst minstens één keer is opgehaald. */
  const loaded = ref(false)
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
    else {
      workouts.value = (data as Workout[]) ?? []
      loaded.value = true
    }
    loading.value = false
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
      .maybeSingle()

    if (err) {
      error.value = err.message
      return null
    }
    return (data as Workout | null) ?? null
  }

  /**
   * Slaat naam + oefeningen op in één transactie (RPC save_workout).
   * Bestaande oefeningen houden hun id, zodat de progressie-teller blijft staan.
   */
  async function saveWorkout(
    id: string | null,
    name: string,
    exercises: ExerciseDraft[],
  ): Promise<string | null> {
    error.value = null

    const { data, error: err } = await supabase.rpc('save_workout', {
      p_id: id,
      p_name: name,
      p_exercises: exercises.map((e) => ({
        id: e.id ?? null,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        increment: e.increment ?? defaultIncrement(e.name),
      })),
    })

    if (err) {
      error.value = err.message
      return null
    }

    await fetchWorkouts()
    return data as string
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
    loading,
    loaded,
    error,
    fetchWorkouts,
    fetchWorkout,
    getWorkout,
    saveWorkout,
    deleteWorkout,
  }
})
