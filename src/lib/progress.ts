import { isSuccess } from './progression'
import { bestE1RM, exerciseVolume } from './stats'
import type { Session } from './types'

export interface ProgressPoint {
  /** ISO-tijdstip waarop de sessie is afgerond. */
  at: string
  weight: number
  /** Geschatte 1RM van de beste set; null als er geen rep is gehaald. */
  e1rm: number | null
  /** Gewicht × alle gehaalde reps (kg). */
  volume: number
  /** Alle sets gehaald. */
  success: boolean
}

export interface ExerciseSeries {
  name: string
  points: ProgressPoint[]
}

/**
 * Gewicht per oefening in de tijd, oudste eerst. Oefeningen zonder gewicht
 * tellen niet mee. De oefening met de meeste metingen staat vooraan.
 */
export function buildSeries(sessions: Session[]): ExerciseSeries[] {
  const byName = new Map<string, ProgressPoint[]>()

  for (const session of sessions) {
    for (const ex of session.session_exercises ?? []) {
      if (ex.weight === null) continue
      const weight = Number(ex.weight)
      const reps = ex.reps_done ?? []
      const points = byName.get(ex.exercise_name) ?? []
      points.push({
        at: session.completed_at,
        weight,
        e1rm: bestE1RM(weight, reps),
        volume: exerciseVolume(weight, reps),
        success: isSuccess(reps, ex.target_reps),
      })
      byName.set(ex.exercise_name, points)
    }
  }

  // Oefeningen die echt veranderen komen eerst: een vlakke lijn is een slechte opening.
  const range = (s: ExerciseSeries) => {
    const weights = s.points.map((p) => p.weight)
    return Math.max(...weights) - Math.min(...weights)
  }

  return [...byName.entries()]
    .map(([name, points]) => ({
      name,
      points: points.sort((a, b) => a.at.localeCompare(b.at)),
    }))
    .sort(
      (a, b) =>
        b.points.length - a.points.length || range(b) - range(a) || a.name.localeCompare(b.name),
    )
}

export interface ChartGeometry {
  /** SVG-pad van de lijn. */
  path: string
  dots: Array<{ x: number; y: number }>
  min: number
  max: number
}

/**
 * Zet waarden om naar coördinaten binnen een vlak van width × height.
 * De punten staan op gelijke afstand: het gaat om het verloop per sessie.
 */
export function lineGeometry(
  values: number[],
  width: number,
  height: number,
  padding = 8,
): ChartGeometry {
  if (!values.length) return { path: '', dots: [], min: 0, max: 0 }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const dots = values.map((v, i) => ({
    x: padding + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    // één meetpunt of een vlakke lijn: midden in het vlak
    y: max === min ? height / 2 : padding + (1 - (v - min) / span) * innerH,
  }))

  const path = dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(' ')
  return { path, dots, min, max }
}

/** Lijn van het gewicht per sessie. */
export function chartGeometry(
  points: Array<{ weight: number; at?: string }>,
  width: number,
  height: number,
  padding = 8,
): ChartGeometry {
  return lineGeometry(
    points.map((p) => p.weight),
    width,
    height,
    padding,
  )
}
