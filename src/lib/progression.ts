import type { SetValue } from './setCircle'

/** Zoveel mislukte sessies op rij op hetzelfde gewicht leiden tot een deload. */
export const FAILS_BEFORE_DELOAD = 3
/** Bij een deload gaat het gewicht 10% omlaag. */
export const DELOAD_FACTOR = 0.9
/** Kleinste stap die je met schijven van 1,25 kg per kant kunt maken. */
export const PLATE_STEP = 2.5

export type ProgressionOutcome = 'none' | 'up' | 'hold' | 'deload'

export interface ProgressionInput {
  weight: number | null
  increment: number
  failCount: number
  targetReps: number
  repsDone: SetValue[]
}

export interface ProgressionResult {
  weight: number | null
  failCount: number
  outcome: ProgressionOutcome
}

/** Rondt af op een veelvoud van `step` (standaard 2,5 kg). */
export function roundToStep(weight: number, step = PLATE_STEP): number {
  if (step <= 0) return weight
  // toFixed vangt drijvende-kommaruis op (0.1 + 0.2-achtige uitkomsten).
  return Number((Math.round(weight / step) * step).toFixed(2))
}

/** Geslaagd = elke set aangetikt en in elke set het doel gehaald. */
export function isSuccess(repsDone: SetValue[], targetReps: number): boolean {
  return repsDone.length > 0 && repsDone.every((v) => v !== null && v >= targetReps)
}

/** Standaardstap: deadlift +5 kg, de rest +2,5 kg (zoals StrongLifts 5×5). */
export function defaultIncrement(exerciseName: string): number {
  return /dead\s*lift/i.test(exerciseName) ? 5 : 2.5
}

/**
 * Bepaalt gewicht en fail_count voor de volgende sessie.
 *
 *   overgeslagen (geen set aangetikt) of geen gewicht -> niets verandert
 *   geslaagd                                          -> + increment, teller op 0
 *   mislukt, nog geen 3x op rij                       -> gewicht blijft, teller + 1
 *   3x op rij mislukt                                 -> 10% terug, teller op 0
 */
export function nextProgression(input: ProgressionInput): ProgressionResult {
  const { weight, increment, failCount, targetReps, repsDone } = input

  const skipped = repsDone.every((v) => v === null)
  if (weight === null || skipped) return { weight, failCount, outcome: 'none' }

  if (isSuccess(repsDone, targetReps)) {
    return {
      weight: Number((weight + increment).toFixed(2)),
      failCount: 0,
      outcome: increment > 0 ? 'up' : 'hold',
    }
  }

  const fails = failCount + 1
  if (fails >= FAILS_BEFORE_DELOAD) {
    return {
      weight: Math.max(0, roundToStep(weight * DELOAD_FACTOR)),
      failCount: 0,
      outcome: 'deload',
    }
  }
  return { weight, failCount: fails, outcome: 'hold' }
}
