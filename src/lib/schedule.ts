/**
 * De workout die nu aan de beurt is: de eerstvolgende na de laatst voltooide,
 * in de volgorde van de lijst en rondlopend (A -> B -> A ...).
 * Onbekende of ontbrekende laatste workout: begin bij de eerste.
 */
export function nextWorkout<T extends { id: string }>(
  workouts: T[],
  lastWorkoutId: string | null,
): T | null {
  if (!workouts.length) return null
  const index = workouts.findIndex((w) => w.id === lastWorkoutId)
  return workouts[(index + 1) % workouts.length]
}

/** Geschatte tijd per set onder de stang, in seconden. */
const SECONDS_PER_SET = 40

/** Geschatte duur in minuten: tijd per set plus rust tussen de sets. */
export function estimateMinutes(exercises: Array<{ sets: number }>, restSeconds: number): number {
  const sets = exercises.reduce((sum, e) => sum + e.sets, 0)
  if (sets === 0) return 0
  const seconds = sets * SECONDS_PER_SET + (sets - 1) * restSeconds
  return Math.max(1, Math.round(seconds / 60))
}
