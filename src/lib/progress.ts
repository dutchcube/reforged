import type { Session } from './types'

export interface ProgressPoint {
  /** ISO-tijdstip waarop de sessie is afgerond. */
  at: string
  weight: number
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
      const points = byName.get(ex.exercise_name) ?? []
      points.push({ at: session.completed_at, weight: Number(ex.weight) })
      byName.set(ex.exercise_name, points)
    }
  }

  return [...byName.entries()]
    .map(([name, points]) => ({
      name,
      points: points.sort((a, b) => a.at.localeCompare(b.at)),
    }))
    .sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name))
}

export interface ChartGeometry {
  /** SVG-pad van de lijn. */
  path: string
  dots: Array<{ x: number; y: number }>
  min: number
  max: number
}

/**
 * Zet meetpunten om naar coördinaten binnen een vlak van width × height.
 * De punten staan op gelijke afstand: het gaat om het verloop per sessie.
 */
export function chartGeometry(
  points: ProgressPoint[],
  width: number,
  height: number,
  padding = 8,
): ChartGeometry {
  if (!points.length) return { path: '', dots: [], min: 0, max: 0 }

  const weights = points.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const dots = points.map((p, i) => ({
    x: padding + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
    // één meetpunt of een vlakke lijn: midden in het vlak
    y: max === min ? height / 2 : padding + (1 - (p.weight - min) / span) * innerH,
  }))

  const path = dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(' ')
  return { path, dots, min, max }
}
