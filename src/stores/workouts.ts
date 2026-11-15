import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { defaultIncrement } from '@/lib/progression'
import { isNetworkError, readJson, writeJson } from '@/lib/storage'
import type { ExerciseDraft, Workout } from '@/lib/types'

const CACHE_KEY = 'reforged:workouts-cache'

export const useWorkoutsStore = defineStore('workouts', () => {
  // Begin met de offline-kopie: de app is direct bruikbaar, ook zonder bereik.
  const workouts = ref<Workout[]>(readJson<Workout[]>(CACHE_KEY, []))
  const loading = ref(false)
  /** True zodra de lijst minstens één keer is opgehaald (of uit de offline-kopie komt). */
  const loaded = ref(workouts.value.length > 0)
  const error = ref<string | null>(null)
  /** True als de laatste poging mislukte door de verbinding. */
  const offline = ref(false)

  async function fetchWorkouts() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .order('position', { ascending: true })
      .order('position', { referencedTable: 'exercises', ascending: true })

    if (err) {
      offline.value = isNetworkError(err.message)
      // Zonder verbinding blijft de offline-kopie staan, zodat je toch kunt trainen.
      if (offline.value && workouts.value.length) loaded.value = true
      else error.value = offline.value ? 'Geen verbinding en nog geen offline-kopie.' : err.message
    } else {
      offline.value = false
      workouts.value = (data as Workout[]) ?? []
      loaded.value = true
      writeJson(CACHE_KEY, workouts.value)
    }
    loading.value = false
  }

  /**
   * Past de progressie van een offline afgeronde sessie alvast lokaal toe,
   * zodat de volgende workout met de juiste gewichten begint.
   */
  function applyProgression(
    updates: Array<{ exerciseId: string | null; weight: number | null; failCount: number }>,
  ) {
    for (const u of updates) {
      if (!u.exerciseId || u.weight === null) continue
      for (const w of workouts.value) {
        const ex = w.exercises?.find((e) => e.id === u.exerciseId)
        if (!ex) continue
        ex.weight = u.weight
        ex.fail_count = u.failCount
      }
    }
    writeJson(CACHE_KEY, workouts.value)
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
    writeJson(CACHE_KEY, workouts.value)
    return true
  }

  return {
    workouts,
    loading,
    loaded,
    error,
    offline,
    applyProgression,
    fetchWorkouts,
    fetchWorkout,
    getWorkout,
    saveWorkout,
    deleteWorkout,
  }
})
