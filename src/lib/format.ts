/** "100kg" i.p.v. "100.0kg"; "22,5kg" met een komma, zoals in het Nederlands. */
export function formatWeight(weight: number | null): string {
  if (weight === null || weight === undefined) return ''
  return `${String(Number(weight)).replace('.', ',')}kg`
}

/** "5×5 · 100kg" of "5×5" als er geen gewicht is. */
export function formatTarget(sets: number, reps: number, weight: number | null): string {
  const base = `${sets}×${reps}`
  const w = formatWeight(weight)
  return w ? `${base} · ${w}` : base
}

/**
 * Gehaalde reps van een oefening: "5×5" als elke set het doel haalde,
 * anders per set uitgeschreven ("5/5/4/3/0").
 */
export function formatReps(repsDone: number[], targetReps: number): string {
  if (!repsDone.length) return '–'
  if (repsDone.every((r) => r === targetReps)) return `${repsDone.length}×${targetReps}`
  return repsDone.join('/')
}

/** "Vandaag", "Gisteren" of "di 12 mrt". `now` is meegeefbaar voor tests. */
export function formatDay(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000)

  if (days === 0) return 'Vandaag'
  if (days === 1) return 'Gisteren'
  return date
    .toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
}

/** "3:05" voor een aantal seconden. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** "13:05" — kloktijd van een tijdstip. */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Duur tussen twee ISO-tijdstippen in hele minuten (minimaal 1). */
export function durationMinutes(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.max(1, Math.round(ms / 60_000))
}
