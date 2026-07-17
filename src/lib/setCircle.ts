/** `null` = pending (nog niet aangetikt); een getal = zoveel reps gehaald. */
export type SetValue = number | null

/**
 * De set-circle-state-machine als pure functie — los te unit-testen (Vitest).
 *
 *   pending --tik--> target --tik--> target-1 --> ... --> 0 --tik--> pending
 */
export function nextSetValue(current: SetValue, target: number): SetValue {
  if (current === null) return target // 1e tik: set volledig gehaald
  if (current <= 0) return null // tik bij 0: terug naar begintoestand
  return current - 1 // minder reps gehaald
}
