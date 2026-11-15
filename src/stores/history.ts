import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/lib/types'

/** Zoveel sessies halen we maximaal op; genoeg voor ruim een jaar 3× per week. */
const LIMIT = 200

export const useHistoryStore = defineStore('history', () => {
  /** Voltooide sessies, nieuwste eerst. */
  const sessions = ref<Session[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  /** Workout van de laatst voltooide sessie — bepaalt welke nu aan de beurt is. */
  const lastWorkoutId = computed(() => sessions.value[0]?.workout_id ?? null)

  /** Laatst ingevulde lichaamsgewicht, als voorzet voor de volgende sessie. */
  const lastBodyWeight = computed(() => {
    const found = sessions.value.find((s) => s.body_weight !== null)
    return found ? Number(found.body_weight) : null
  })

  async function fetchSessions() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('sessions')
      .select('*, session_exercises(*)')
      .order('completed_at', { ascending: false })
      .order('position', { referencedTable: 'session_exercises', ascending: true })
      .limit(LIMIT)

    if (err) error.value = err.message
    else {
      sessions.value = (data as Session[]) ?? []
      loaded.value = true
    }
    loading.value = false
  }

  async function deleteSession(id: string) {
    error.value = null
    const { error: err } = await supabase.from('sessions').delete().eq('id', id)
    if (err) {
      error.value = err.message
      return false
    }
    sessions.value = sessions.value.filter((s) => s.id !== id)
    return true
  }

  return { sessions, loading, loaded, error, lastWorkoutId, lastBodyWeight, fetchSessions, deleteSession }
})
