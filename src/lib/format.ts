/** "100" i.p.v. "100.0", maar "22.5" blijft "22.5". */
export function formatWeight(weight: number | null): string {
  if (weight === null || weight === undefined) return ''
  return `${Number(weight)}kg`
}

/** "5×5 100kg" of "5×5" als er geen gewicht is. */
export function formatTarget(sets: number, reps: number, weight: number | null): string {
  const base = `${sets}×${reps}`
  const w = formatWeight(weight)
  return w ? `${base} · ${w}` : base
}

/** "Vandaag", "Gisteren" of "12 mrt". */
export function formatDay(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000)

  if (days === 0) return 'Vandaag'
  if (days === 1) return 'Gisteren'
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
