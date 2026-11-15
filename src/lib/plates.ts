/** Gangbare schijven in een sportschool (kg), zwaarste eerst. */
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

export interface PlateLoad {
  /** Schijven voor één kant van de stang, zwaarste eerst. */
  perSide: number[]
  /** Wat per kant niet met deze schijven te maken is (0 als het precies past). */
  remainder: number
}

/**
 * Welke schijven moeten er per kant op de stang voor dit totaalgewicht?
 * Geeft null als het gewicht niet boven de lege stang uitkomt.
 */
export function platesPerSide(
  total: number | null,
  barWeight = 20,
  plates: number[] = DEFAULT_PLATES,
): PlateLoad | null {
  if (total === null || !Number.isFinite(total) || total <= barWeight) return null

  // Reken in grammen: zo stapelt de drijvende-kommaruis van 1,25 kg zich niet op.
  let left = Math.round(((total - barWeight) / 2) * 1000)
  const perSide: number[] = []

  for (const plate of [...plates].sort((a, b) => b - a)) {
    const grams = Math.round(plate * 1000)
    while (grams > 0 && left >= grams) {
      perSide.push(plate)
      left -= grams
    }
  }

  return { perSide, remainder: left / 1000 }
}

/** "20 + 15 + 5 + 1,25" — schijven per kant, met een komma zoals in het Nederlands. */
export function formatPlates(load: PlateLoad): string {
  return load.perSide.map((p) => String(p).replace('.', ',')).join(' + ')
}
