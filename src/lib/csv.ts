import { bestE1RM, dayKey, exerciseVolume } from './stats'
import type { Session } from './types'

const HEADER = [
  'Datum',
  'Start',
  'Einde',
  'Workout',
  'Oefening',
  'Doel sets',
  'Doel reps',
  'Gewicht (kg)',
  'Reps per set',
  'Totaal reps',
  'Volume (kg)',
  'Geschatte 1RM (kg)',
  'Lichaamsgewicht (kg)',
  'Notitie',
]

/** Decimale komma, zodat een Nederlandse Excel het als getal leest. */
function num(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}

function time(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function cell(value: string): string {
  // Tekst die met = + - @ begint zou Excel als formule uitvoeren; een apostrof voorkomt dat.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/**
 * Historie als CSV: één regel per oefening per sessie, oudste eerst.
 * Puntkomma als scheidingsteken (de Nederlandse Excel-standaard).
 */
export function sessionsToCsv(sessions: Session[]): string {
  const rows: string[][] = [HEADER]
  const ordered = [...sessions].sort((a, b) => a.completed_at.localeCompare(b.completed_at))

  for (const s of ordered) {
    const shared = {
      date: dayKey(new Date(s.completed_at)),
      start: time(s.started_at),
      end: time(s.completed_at),
      body: num(s.body_weight === null ? null : Number(s.body_weight)),
      note: s.note ?? '',
    }
    for (const ex of s.session_exercises ?? []) {
      const weight = ex.weight === null ? null : Number(ex.weight)
      const reps = ex.reps_done ?? []
      rows.push([
        shared.date,
        shared.start,
        shared.end,
        s.workout_name,
        ex.exercise_name,
        String(ex.target_sets),
        String(ex.target_reps),
        num(weight),
        reps.join('/'),
        String(reps.reduce((sum, r) => sum + r, 0)),
        num(weight === null ? null : exerciseVolume(weight, reps)),
        num(bestE1RM(weight, reps)),
        shared.body,
        shared.note,
      ])
    }
  }

  return rows.map((r) => r.map(cell).join(';')).join('\r\n')
}

/** Biedt tekst als bestand aan in de browser. De BOM laat Excel de UTF-8 herkennen. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
