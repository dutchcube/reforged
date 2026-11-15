import { roundToStep } from './progression'

export interface WarmupSet {
  weight: number
  reps: number
  sets: number
}

/** Opbouw naar het werkgewicht: aandeel van het werkgewicht + aantal reps. */
const STEPS: Array<[share: number, reps: number]> = [
  [0.4, 5],
  [0.6, 3],
  [0.8, 2],
]

/**
 * Opwarmsets voor één oefening: twee sets met de lege stang, daarna in stappen
 * omhoog. Stappen die niet boven de stang of onder het werkgewicht uitkomen
 * vallen weg. Zonder gewicht, of met een werkgewicht tot en met de stang,
 * is er geen opwarming.
 */
export function warmupSets(workWeight: number | null, barWeight = 20): WarmupSet[] {
  if (workWeight === null || workWeight <= barWeight) return []

  const result: WarmupSet[] = [{ weight: barWeight, reps: 5, sets: 2 }]
  for (const [share, reps] of STEPS) {
    const weight = roundToStep(workWeight * share)
    const previous = result[result.length - 1].weight
    if (weight > previous && weight < workWeight) result.push({ weight, reps, sets: 1 })
  }
  return result
}
