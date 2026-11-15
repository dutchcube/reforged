import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { isNetworkError, readJson, writeJson } from '@/lib/storage'
import type { Session } from '@/lib/types'

/** Zoveel sessies halen we maximaal op; genoeg voor ruim een jaar 3× per week. */
const LIMIT = 200
const CACHE_KEY = 'reforged:history-cache'
const LOCAL_KEY = 'reforged:history-local'

export const useHistoryStore = defineStore('history', () => {
  /** Sessies die offline zijn afgerond en nog niet op de server staan. */
  const local = ref<Session[]>(readJson<Session[]>(LOCAL_KEY, []))
  /** Laatst opgehaalde sessies van de server (of de offline-kopie daarvan). */
  const remote = ref<Session[]>(readJson<Session[]>(CACHE_KEY, []))

  const loading = ref(false)
  const loaded = ref(remote.value.length > 0 || local.value.length > 0)
  const error = ref<string | null>(null)
  /** True als de laatste poging mislukte door de verbinding: je ziet de offline-kopie. */
  const offline = ref(false)

  /** Voltooide sessies, nieuwste eerst. */
  const sessions = computed<Session[]>(() => {
    const known = new Set(remote.value.map((s) => s.id))
    return [...local.value.filter((s) => !known.has(s.id)), ...remote.value].sort((a, b) =>
      b.completed_at.localeCompare(a.completed_at),
    )
  })

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

    if (err) {
      offline.value = isNetworkError(err.message)
      // Zonder verbinding blijft de offline-kopie staan; dat is geen foutmelding waard.
      if (!offline.value) error.value = err.message
      else loaded.value = true
    } else {
      offline.value = false
      remote.value = (data as Session[]) ?? []
      loaded.value = true
      writeJson(CACHE_KEY, remote.value)
    }
    loading.value = false
  }

  /** Zet een offline afgeronde sessie alvast in de lijst. */
  function addLocal(session: Session) {
    local.value = [session, ...local.value.filter((s) => s.id !== session.id)]
    writeJson(LOCAL_KEY, local.value)
    loaded.value = true
  }

  /** De sessie staat nu op de server: de lokale kopie kan weg. */
  function removeLocal(id: string) {
    local.value = local.value.filter((s) => s.id !== id)
    writeJson(LOCAL_KEY, local.value)
  }

  async function deleteSession(id: string) {
    error.value = null
    if (local.value.some((s) => s.id === id)) {
      error.value = 'Deze sessie wacht nog op synchronisatie en kan pas daarna worden verwijderd.'
      return false
    }
    const { error: err } = await supabase.from('sessions').delete().eq('id', id)
    if (err) {
      error.value = isNetworkError(err.message)
        ? 'Geen verbinding. Probeer het opnieuw zodra je online bent.'
        : err.message
      return false
    }
    remote.value = remote.value.filter((s) => s.id !== id)
    writeJson(CACHE_KEY, remote.value)
    return true
  }

  return {
    sessions,
    loading,
    loaded,
    error,
    offline,
    lastWorkoutId,
    lastBodyWeight,
    fetchSessions,
    addLocal,
    removeLocal,
    deleteSession,
  }
})
