import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Workout } from '@/lib/types'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }))

// De store spiegelt de sessie in localStorage; in Node bestaat die niet.
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
})

const { useSessionStore } = await import('./session')
const { useHistoryStore } = await import('./history')
const { useWorkoutsStore } = await import('./workouts')

const exercise = (id: string, name: string, sets: number, weight: number | null, extra = {}) => ({
  id,
  workout_id: 'w1',
  user_id: 'u',
  name,
  sets,
  reps: 5,
  weight,
  increment: 2.5,
  fail_count: 0,
  position: 0,
  ...extra,
})

const workout: Workout = {
  id: 'w1',
  user_id: 'u',
  name: 'Workout A',
  position: 0,
  created_at: '2026-11-01T00:00:00Z',
  exercises: [
    exercise('e1', 'Squat', 2, 100),
    exercise('e2', 'Bench Press', 2, 60, { fail_count: 2 }),
    exercise('e3', 'Plank', 1, null),
    exercise('e4', 'Deadlift', 1, 120, { increment: 5 }),
  ],
}

describe('session store', () => {
  beforeEach(() => {
    storage.clear()
    rpc.mockReset()
    setActivePinia(createPinia())
  })

  it('telt afgetikte sets en signaleert een andere lopende workout', () => {
    const session = useSessionStore()
    session.start(workout)

    expect(session.totalSets).toBe(6)
    expect(session.tapSet(0, 0)).toBe(5)
    expect(session.tapSet(0, 0)).toBe(4)
    expect(session.completedSets).toBe(1)

    expect(session.conflictsWith('w1')).toBe(false)
    expect(session.conflictsWith('w2')).toBe(true)
  })

  it('stelt het gewicht bij in stappen en komt niet onder 0', () => {
    const session = useSessionStore()
    session.start(workout)

    session.adjustWeight(0, 2.5)
    expect(session.active?.exercises[0].weight).toBe(102.5)
    session.adjustWeight(0, -500)
    expect(session.active?.exercises[0].weight).toBe(0)
    session.adjustWeight(2, 2.5) // oefening zonder gewicht blijft zonder gewicht
    expect(session.active?.exercises[2].weight).toBeNull()
  })

  it('stuurt bij afronden de sets en de progressie in één RPC mee', async () => {
    rpc.mockResolvedValue({ data: 's1', error: null })
    const session = useSessionStore()
    session.start(workout, 80)

    // Squat: beide sets gehaald -> +2,5 kg
    session.tapSet(0, 0)
    session.tapSet(0, 1)
    // Bench Press: tweede set 4 reps, en het was al 2x mislukt -> deload
    session.tapSet(1, 0)
    session.tapSet(1, 1)
    session.tapSet(1, 1)
    // Plank (zonder gewicht) afgetikt; Deadlift overgeslagen
    session.tapSet(2, 0)
    session.active!.note = 'Ging lekker'

    expect(await session.finish()).toBe('saved')
    expect(session.active).toBeNull()

    expect(rpc).toHaveBeenCalledTimes(1)
    const [fn, args] = rpc.mock.calls[0]
    expect(fn).toBe('finish_session')
    expect(args.p_session).toMatchObject({
      workout_id: 'w1',
      workout_name: 'Workout A',
      body_weight: 80,
      note: 'Ging lekker',
    })
    expect(args.p_session.exercises).toEqual([
      {
        exercise_id: 'e1',
        exercise_name: 'Squat',
        target_sets: 2,
        target_reps: 5,
        weight: 100,
        reps_done: [5, 5],
        next_weight: 102.5,
        next_fail_count: 0,
      },
      {
        exercise_id: 'e2',
        exercise_name: 'Bench Press',
        target_sets: 2,
        target_reps: 5,
        weight: 60,
        reps_done: [5, 4],
        next_weight: 55, // 60 × 0,9 = 54 -> afgerond op 2,5
        next_fail_count: 0,
      },
      {
        exercise_id: 'e3',
        exercise_name: 'Plank',
        target_sets: 1,
        target_reps: 5,
        weight: null,
        reps_done: [5],
        next_weight: null,
        next_fail_count: 0,
      },
      {
        exercise_id: 'e4',
        exercise_name: 'Deadlift',
        target_sets: 1,
        target_reps: 5,
        weight: 120,
        reps_done: [0],
        next_weight: null, // overgeslagen: gewicht blijft staan
        next_fail_count: 0,
      },
    ])
  })

  it('houdt de sessie vast als opslaan mislukt door een fout van de server', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    const session = useSessionStore()
    session.start(workout)
    session.tapSet(0, 0)

    expect(await session.finish()).toBe('failed')
    expect(session.active?.exercises[0].values[0]).toBe(5)
    expect(session.error).toContain('permission denied')
    expect(session.pendingCount).toBe(0)
  })

  it('zet de sessie zonder verbinding in de wachtrij en verstuurt hem later', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch' } })
    const session = useSessionStore()
    const history = useHistoryStore()
    session.start(workout, 80)
    session.tapSet(0, 0)
    session.tapSet(0, 1)

    expect(await session.finish()).toBe('queued')
    expect(session.active).toBeNull()
    expect(session.error).toBeNull()
    expect(session.pendingCount).toBe(1)
    expect(session.lastSummary).toMatchObject({ queued: true, volume: 1000 })
    expect(session.lastSummary?.exercises[0]).toMatchObject({ outcome: 'up', nextWeight: 102.5 })
    // de sessie staat alvast in de historie en overleeft een herstart van de app
    expect(history.sessions).toHaveLength(1)
    expect(JSON.parse(storage.get('reforged:pending-sessions')!)).toHaveLength(1)

    // nog steeds offline: er verandert niets
    expect(await session.flushPending()).toBe(0)
    expect(session.pendingCount).toBe(1)

    // weer online: dezelfde sessie (zelfde id en eindtijd) gaat alsnog naar de server
    rpc.mockResolvedValue({ data: 's1', error: null })
    expect(await session.flushPending()).toBe(1)
    expect(session.pendingCount).toBe(0)
    expect(history.sessions).toHaveLength(0)

    const first = rpc.mock.calls[0][1].p_session
    const last = rpc.mock.calls[rpc.mock.calls.length - 1][1].p_session
    expect(last).toEqual(first)
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(first.completed_at >= first.started_at).toBe(true)
  })

  it('past offline de progressie alvast toe op de bewaarde workouts', async () => {
    const workouts = useWorkoutsStore()
    workouts.workouts = [structuredClone(workout)]
    rpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })
    const session = useSessionStore()
    session.start(workouts.workouts[0])
    session.tapSet(0, 0)
    session.tapSet(0, 1)

    await session.finish()
    expect(workouts.workouts[0].exercises?.[0].weight).toBe(102.5)
    expect(workouts.workouts[0].exercises?.[3].weight).toBe(120) // overgeslagen: ongewijzigd
  })

  it('ziet een dubbel verstuurde sessie als opgeslagen', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } })
    const session = useSessionStore()
    session.start(workout)
    session.tapSet(0, 0)

    expect(await session.finish()).toBe('saved')
    expect(session.pendingCount).toBe(0)
  })

  it('stuurt een leeggemaakt lichaamsgewicht als null', async () => {
    rpc.mockResolvedValue({ data: 's1', error: null })
    const session = useSessionStore()
    session.start(workout, 80)
    // v-model.number geeft '' terug voor een leeg veld
    session.active!.bodyWeight = '' as unknown as number

    await session.finish()
    expect(rpc.mock.calls[0][1].p_session.body_weight).toBeNull()
  })
})
