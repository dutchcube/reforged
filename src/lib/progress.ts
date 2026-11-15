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
  /** Gehaalde reps per set en het doel, voor de lijst met sessies. */
  reps: number[]
  targetReps: number
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
        reps,
        targetReps: ex.target_reps,
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

/** Rondt een stapgrootte af naar een "mooi" getal: 1, 2, 2,5 of 5 maal een macht van tien. */
function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * pow
}

/**
 * Waarden voor de y-as: ronde getallen die het bereik min–max omsluiten,
 * ongeveer `target` stuks. Een vlakke reeks krijgt een streep erboven en eronder.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  const clean = (n: number) => Number(n.toFixed(6))
  if (min === max) {
    const pad = niceStep(Math.abs(min) * 0.1 || 1)
    return [clean(min - pad), min, clean(min + pad)]
  }
  const step = niceStep((max - min) / (target - 1))
  const start = Math.floor(clean(min / step)) * step
  const end = Math.ceil(clean(max / step)) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step) ticks.push(clean(v))
  return ticks
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
