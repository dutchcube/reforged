import { describe, expect, it } from 'vitest'
import {
  durationMinutes,
  formatClock,
  formatDay,
  formatReps,
  formatTarget,
  formatTime,
  formatWeight,
} from './format'
import { buildSeries, chartGeometry } from './progress'
import { estimateMinutes, nextWorkout } from './schedule'
import type { Session } from './types'
import { warmupSets } from './warmup'

describe('format', () => {
  it('formatWeight gebruikt een komma en laat nullen weg', () => {
    expect(formatWeight(100)).toBe('100kg')
    expect(formatWeight(22.5)).toBe('22,5kg')
    expect(formatWeight(null)).toBe('')
  })

  it('formatTarget toont het gewicht alleen als het er is', () => {
    expect(formatTarget(5, 5, 100)).toBe('5×5 · 100kg')
    expect(formatTarget(3, 8, null)).toBe('3×8')
  })

  it('formatReps vat volledige sets samen en schrijft de rest uit', () => {
    expect(formatReps([5, 5, 5, 5, 5], 5)).toBe('5×5')
    expect(formatReps([5, 5, 5, 4, 0], 5)).toBe('5/5/5/4/0')
    expect(formatReps([5], 5)).toBe('1×5')
    expect(formatReps([], 5)).toBe('–')
  })

  it('formatDay kent vandaag en gisteren', () => {
    const now = new Date(2026, 10, 15, 12, 0)
    expect(formatDay(new Date(2026, 10, 15, 8, 0).toISOString(), now)).toBe('Vandaag')
    expect(formatDay(new Date(2026, 10, 14, 23, 0).toISOString(), now)).toBe('Gisteren')
    expect(formatDay(new Date(2026, 10, 10, 9, 0).toISOString(), now)).toMatch(/10 nov/)
  })

  it('formatClock en formatTime vullen aan met nullen', () => {
    expect(formatClock(185)).toBe('3:05')
    expect(formatClock(-4)).toBe('0:00')
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe('09:05')
  })

  it('durationMinutes rondt af en is minimaal 1', () => {
    expect(durationMinutes('2026-11-15T10:00:00Z', '2026-11-15T10:42:20Z')).toBe(42)
    expect(durationMinutes('2026-11-15T10:00:00Z', '2026-11-15T10:00:05Z')).toBe(1)
  })
})

describe('nextWorkout', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('begint bij de eerste zonder historie', () => {
    expect(nextWorkout(list, null)?.id).toBe('a')
  })

  it('kiest de volgende en loopt rond', () => {
    expect(nextWorkout(list, 'a')?.id).toBe('b')
    expect(nextWorkout(list, 'c')?.id).toBe('a')
  })

  it('begint bij de eerste als de laatste workout niet meer bestaat', () => {
    expect(nextWorkout(list, 'verwijderd')?.id).toBe('a')
  })

  it('geeft null zonder workouts en dezelfde bij één workout', () => {
    expect(nextWorkout([], 'a')).toBeNull()
    expect(nextWorkout([{ id: 'a' }], 'a')?.id).toBe('a')
  })
})

describe('estimateMinutes', () => {
  it('telt tijd per set plus rust tussen de sets', () => {
    // 11 sets: 11 × 40 s + 10 × 180 s = 2240 s ≈ 37 min
    expect(estimateMinutes([{ sets: 5 }, { sets: 5 }, { sets: 1 }], 180)).toBe(37)
  })

  it('is 0 zonder sets', () => {
    expect(estimateMinutes([], 180)).toBe(0)
  })
})

describe('warmupSets', () => {
  it('bouwt op vanaf de lege stang', () => {
    expect(warmupSets(100)).toEqual([
      { weight: 20, reps: 5, sets: 2 },
      { weight: 40, reps: 5, sets: 1 },
      { weight: 60, reps: 3, sets: 1 },
      { weight: 80, reps: 2, sets: 1 },
    ])
  })

  it('slaat stappen over die niet boven de vorige uitkomen', () => {
    // 30 kg: 40% = 12,5 (onder de stang), 60% = 17,5 (onder de stang), 80% = 25
    expect(warmupSets(30)).toEqual([
      { weight: 20, reps: 5, sets: 2 },
      { weight: 25, reps: 2, sets: 1 },
    ])
  })

  it('geeft niets zonder gewicht of op stanggewicht', () => {
    expect(warmupSets(null)).toEqual([])
    expect(warmupSets(20)).toEqual([])
    expect(warmupSets(15)).toEqual([])
  })

  it('rekent met een andere stang', () => {
    expect(warmupSets(40, 15)[0]).toEqual({ weight: 15, reps: 5, sets: 2 })
  })
})

describe('buildSeries', () => {
  const session = (completed_at: string, exercises: Array<[string, number | null]>): Session => ({
    id: completed_at,
    user_id: 'u',
    workout_id: null,
    workout_name: 'Workout A',
    started_at: completed_at,
    completed_at,
    body_weight: null,
    note: null,
    session_exercises: exercises.map(([exercise_name, weight], position) => ({
      id: `${completed_at}-${position}`,
      session_id: completed_at,
      user_id: 'u',
      exercise_name,
      target_sets: 5,
      target_reps: 5,
      weight,
      reps_done: [5, 5, 5, 5, 5],
      position,
    })),
  })

  // Nieuwste eerst, zoals de historie uit de database komt.
  const sessions = [
    session('2026-11-14T10:00:00Z', [['Squat', 105], ['Plank', null]]),
    session('2026-11-12T10:00:00Z', [['Squat', 102.5], ['Bench Press', 60]]),
    session('2026-11-10T10:00:00Z', [['Squat', 100]]),
  ]

  it('zet de punten per oefening oudste eerst', () => {
    const squat = buildSeries(sessions).find((s) => s.name === 'Squat')
    expect(squat?.points.map((p) => p.weight)).toEqual([100, 102.5, 105])
  })

  it('zet de oefening met de meeste metingen vooraan en laat gewichtloze weg', () => {
    expect(buildSeries(sessions).map((s) => s.name)).toEqual(['Squat', 'Bench Press'])
  })

  it('geeft een lege lijst zonder sessies', () => {
    expect(buildSeries([])).toEqual([])
  })
})

describe('chartGeometry', () => {
  const at = '2026-11-10T10:00:00Z'

  it('zet het laagste punt onderaan en het hoogste bovenaan', () => {
    const g = chartGeometry(
      [
        { at, weight: 100 },
        { at, weight: 110 },
      ],
      320,
      160,
      10,
    )
    expect(g.dots).toEqual([
      { x: 10, y: 150 },
      { x: 310, y: 10 },
    ])
    expect(g.path).toBe('M10.0 150.0 L310.0 10.0')
    expect([g.min, g.max]).toEqual([100, 110])
  })

  it('zet één punt of een vlakke lijn in het midden', () => {
    expect(chartGeometry([{ at, weight: 80 }], 320, 160, 10).dots).toEqual([{ x: 160, y: 80 }])
    const flat = chartGeometry(
      [
        { at, weight: 80 },
        { at, weight: 80 },
      ],
      320,
      160,
      10,
    )
    expect(flat.dots.map((d) => d.y)).toEqual([80, 80])
  })

  it('geeft een leeg pad zonder punten', () => {
    expect(chartGeometry([], 320, 160).path).toBe('')
  })
})
