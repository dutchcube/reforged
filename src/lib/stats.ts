import { isSuccess } from './progression'
import type { Session } from './types'

// ------------------------------------------------------------------ 1RM en volume

/**
 * Geschatte 1RM volgens Epley: gewicht × (1 + reps / 30).
 * Eén rep is per definitie het gewicht zelf; nul reps levert 0 op.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return Number((weight * (1 + reps / 30)).toFixed(1))
}

/** Hoogste geschatte 1RM over de sets van één oefening; null zonder gehaalde rep. */
export function bestE1RM(weight: number | null, repsDone: number[]): number | null {
  if (weight === null || weight <= 0) return null
  const best = Math.max(0, ...repsDone)
  return best > 0 ? estimate1RM(weight, best) : null
}

/** Verplaatst gewicht: gewicht × alle gehaalde reps. */
export function exerciseVolume(weight: number | null, repsDone: number[]): number {
  if (weight === null) return 0
  const reps = repsDone.reduce((sum, r) => sum + Math.max(0, r), 0)
  return Number((weight * reps).toFixed(2))
}

export function sessionVolume(session: Session): number {
  return (session.session_exercises ?? []).reduce(
    (sum, ex) => sum + exerciseVolume(ex.weight === null ? null : Number(ex.weight), ex.reps_done ?? []),
    0,
  )
}

// ------------------------------------------------------------------------ records

export interface ExerciseRecord {
  name: string
  /** Zwaarste gewicht waarmee minstens één rep is gehaald. */
  maxWeight: number
  maxWeightAt: string
  maxE1RM: number
  maxE1RMAt: string
}

/** Persoonlijke records per oefening, zwaarste eerst. */
export function buildRecords(sessions: Session[]): ExerciseRecord[] {
  const byName = new Map<string, ExerciseRecord>()
  // oudste eerst: bij een gelijke stand telt de eerste keer als recorddatum
  const ordered = [...sessions].sort((a, b) => a.completed_at.localeCompare(b.completed_at))

  for (const session of ordered) {
    for (const ex of session.session_exercises ?? []) {
      if (ex.weight === null) continue
      const weight = Number(ex.weight)
      const e1rm = bestE1RM(weight, ex.reps_done ?? [])
      if (e1rm === null) continue

      const rec = byName.get(ex.exercise_name)
      if (!rec) {
        byName.set(ex.exercise_name, {
          name: ex.exercise_name,
          maxWeight: weight,
          maxWeightAt: session.completed_at,
          maxE1RM: e1rm,
          maxE1RMAt: session.completed_at,
        })
        continue
      }
      if (weight > rec.maxWeight) {
        rec.maxWeight = weight
        rec.maxWeightAt = session.completed_at
      }
      if (e1rm > rec.maxE1RM) {
        rec.maxE1RM = e1rm
        rec.maxE1RMAt = session.completed_at
      }
    }
  }

  return [...byName.values()].sort((a, b) => b.maxE1RM - a.maxE1RM || a.name.localeCompare(b.name))
}

export interface FinishedExercise {
  name: string
  weight: number | null
  repsDone: number[]
}

export interface NewRecord {
  name: string
  kind: 'weight' | 'e1rm'
  value: number
  previous: number
}

/**
 * Records die een zojuist afgeronde sessie breekt ten opzichte van de historie.
 * De eerste keer dat je een oefening doet telt niet: dan is alles een record.
 * Breek je het gewichtsrecord, dan melden we de 1RM niet nog eens apart.
 */
export function findNewRecords(history: Session[], finished: FinishedExercise[]): NewRecord[] {
  const records = new Map(buildRecords(history).map((r) => [r.name, r]))
  const found: NewRecord[] = []

  for (const ex of finished) {
    const prev = records.get(ex.name)
    const e1rm = bestE1RM(ex.weight, ex.repsDone)
    if (!prev || ex.weight === null || e1rm === null) continue

    if (ex.weight > prev.maxWeight) {
      found.push({ name: ex.name, kind: 'weight', value: ex.weight, previous: prev.maxWeight })
    } else if (e1rm > prev.maxE1RM) {
      found.push({ name: ex.name, kind: 'e1rm', value: e1rm, previous: prev.maxE1RM })
    }
  }
  return found
}

// --------------------------------------------------------------- kalender en weken

/** "2026-11-15" in lokale tijd — sleutel voor een kalenderdag. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Maandag 00:00 (lokale tijd) van de week waarin `date` valt. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export interface CalendarDay {
  key: string
  /** Aantal sessies op deze dag. */
  count: number
  future: boolean
}

/**
 * Raster van de laatste `weeks` weken: één kolom per week (oudste eerst),
 * zeven dagen per kolom vanaf maandag.
 */
export function calendarGrid(sessions: Session[], weeks: number, now = new Date()): CalendarDay[][] {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    const key = dayKey(new Date(s.completed_at))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const today = dayKey(now)
  const first = addDays(startOfWeek(now), -7 * (weeks - 1))

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = dayKey(addDays(first, w * 7 + d))
      return { key, count: counts.get(key) ?? 0, future: key > today }
    }),
  )
}

export interface Consistency {
  thisWeek: number
  thisMonth: number
  total: number
  /** Aantal weken op rij met minstens één training (de lopende week mag nog leeg zijn). */
  weekStreak: number
}

export function consistency(sessions: Session[], now = new Date()): Consistency {
  const weekStart = startOfWeek(now)
  const weeksWithSession = new Set<string>()
  let thisWeek = 0
  let thisMonth = 0

  for (const s of sessions) {
    const date = new Date(s.completed_at)
    weeksWithSession.add(dayKey(startOfWeek(date)))
    if (date >= weekStart) thisWeek++
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) thisMonth++
  }

  let weekStreak = 0
  let cursor = weekStart
  // Nog niet getraind deze week? Dan is de reeks niet meteen verbroken.
  if (!weeksWithSession.has(dayKey(cursor))) cursor = addDays(cursor, -7)
  while (weeksWithSession.has(dayKey(cursor))) {
    weekStreak++
    cursor = addDays(cursor, -7)
  }

  return { thisWeek, thisMonth, total: sessions.length, weekStreak }
}

export interface WeekVolume {
  /** Dagsleutel van de maandag. */
  weekStart: string
  volume: number
  sessions: number
}

/** Volume per week voor de laatste `weeks` weken, oudste eerst. Lege weken tellen als 0. */
export function weeklyVolume(sessions: Session[], weeks: number, now = new Date()): WeekVolume[] {
  const first = addDays(startOfWeek(now), -7 * (weeks - 1))
  const result: WeekVolume[] = Array.from({ length: weeks }, (_, i) => ({
    weekStart: dayKey(addDays(first, i * 7)),
    volume: 0,
    sessions: 0,
  }))
  const index = new Map(result.map((w, i) => [w.weekStart, i]))

  for (const s of sessions) {
    const i = index.get(dayKey(startOfWeek(new Date(s.completed_at))))
    if (i === undefined) continue
    result[i].volume += sessionVolume(s)
    result[i].sessions++
  }
  for (const w of result) w.volume = Math.round(w.volume)
  return result
}

// ------------------------------------------------------------------ lichaamsgewicht

export interface BodyWeightPoint {
  at: string
  weight: number
}

/** Ingevulde lichaamsgewichten, oudste eerst. */
export function bodyWeightSeries(sessions: Session[]): BodyWeightPoint[] {
  return sessions
    .filter((s) => s.body_weight !== null)
    .map((s) => ({ at: s.completed_at, weight: Number(s.body_weight) }))
    .sort((a, b) => a.at.localeCompare(b.at))
}

// ----------------------------------------------------------------- aandachtspunten

export interface ExerciseHealth {
  name: string
  weight: number
  /** Aantal laatste sessies op rij op dit gewicht waarin niet alle sets zijn gehaald. */
  failStreak: number
  /** Hoe vaak het gewicht minstens 5% is gezakt ten opzichte van de sessie ervoor. */
  drops: number
}

/**
 * Per oefening: loopt hij vast en hoe vaak is het gewicht verlaagd?
 * Alleen oefeningen met een failStreak of een verlaging komen terug.
 */
export function exerciseHealth(
  sessions: Session[],
  /** Huidige stap per oefening. Stap 0 = accessoire: die loopt nooit vast en krijgt geen deload. */
  increments?: ReadonlyMap<string, number>,
): ExerciseHealth[] {
  const byName = new Map<string, Array<{ at: string; weight: number; success: boolean }>>()
  for (const s of sessions) {
    for (const ex of s.session_exercises ?? []) {
      if (ex.weight === null) continue
      if (increments?.get(ex.exercise_name) === 0) continue
      const reps = ex.reps_done ?? []
      // overgeslagen oefening zegt niets over vastlopen
      if (reps.every((r) => r === 0)) continue
      const list = byName.get(ex.exercise_name) ?? []
      list.push({
        at: s.completed_at,
        weight: Number(ex.weight),
        success: isSuccess(reps, ex.target_reps),
      })
      byName.set(ex.exercise_name, list)
    }
  }

  const result: ExerciseHealth[] = []
  for (const [name, list] of byName) {
    list.sort((a, b) => a.at.localeCompare(b.at))
    const last = list[list.length - 1]

    let failStreak = 0
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].weight !== last.weight || list[i].success) break
      failStreak++
    }

    let drops = 0
    for (let i = 1; i < list.length; i++) {
      if (list[i].weight <= list[i - 1].weight * 0.95) drops++
    }

    if (failStreak > 0 || drops > 0) result.push({ name, weight: last.weight, failStreak, drops })
  }

  return result.sort((a, b) => b.failStreak - a.failStreak || b.drops - a.drops || a.name.localeCompare(b.name))
}
