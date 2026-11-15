import { describe, expect, it } from 'vitest'
import { sessionsToCsv } from './csv'
import { formatKg, formatShortDate } from './format'
import { formatPlates, platesPerSide } from './plates'
import { buildSeries } from './progress'
import {
  bestE1RM,
  bodyWeightSeries,
  buildRecords,
  calendarGrid,
  consistency,
  dayKey,
  estimate1RM,
  exerciseHealth,
  exerciseVolume,
  findNewRecords,
  startOfWeek,
  weeklyVolume,
} from './stats'
import type { Session } from './types'

/** Lokale datum (maand 1-12) als ISO-tijdstip, zodat de tests in elke tijdzone kloppen. */
const at = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour).toISOString()

type Ex = [name: string, weight: number | null, reps: number[]]

const session = (
  completed_at: string,
  exercises: Ex[],
  extra: Partial<Session> = {},
): Session => ({
  id: completed_at,
  user_id: 'u',
  workout_id: null,
  workout_name: 'Workout A',
  started_at: completed_at,
  completed_at,
  body_weight: null,
  note: null,
  session_exercises: exercises.map(([exercise_name, weight, reps_done], position) => ({
    id: `${completed_at}-${position}`,
    session_id: completed_at,
    user_id: 'u',
    exercise_name,
    target_sets: reps_done.length,
    target_reps: 5,
    weight,
    reps_done,
    position,
  })),
  ...extra,
})

const FIVES = [5, 5, 5, 5, 5]

// Zondag 15 november 2026; de week begon op maandag 9 november.
const NOW = new Date(2026, 10, 15, 20)

describe('1RM en volume', () => {
  it('schat de 1RM met Epley', () => {
    expect(estimate1RM(100, 5)).toBe(116.7)
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(100, 0)).toBe(0)
  })

  it('neemt de beste set en geeft null zonder gehaalde rep', () => {
    expect(bestE1RM(100, [5, 4, 3])).toBe(116.7)
    expect(bestE1RM(100, [0, 0])).toBeNull()
    expect(bestE1RM(null, [5])).toBeNull()
  })

  it('telt volume als gewicht × gehaalde reps', () => {
    expect(exerciseVolume(100, [5, 5, 4])).toBe(1400)
    expect(exerciseVolume(null, [5, 5])).toBe(0)
  })

  it('zet 1RM, volume en succes in de reeks per oefening', () => {
    const [squat] = buildSeries([session(at(11, 10), [['Squat', 100, [5, 5, 4]]])])
    expect(squat.points[0]).toMatchObject({ weight: 100, e1rm: 116.7, volume: 1400, success: false })
  })
})

describe('records', () => {
  const history = [
    session(at(11, 12), [['Squat', 102.5, [5, 5, 3]]]),
    session(at(11, 10), [
      ['Squat', 100, FIVES],
      ['Plank', null, [5]],
    ]),
  ]

  it('bewaart het zwaarste gewicht en de hoogste 1RM met hun datum', () => {
    expect(buildRecords(history)).toEqual([
      {
        name: 'Squat',
        maxWeight: 102.5,
        maxWeightAt: at(11, 12),
        maxE1RM: estimate1RM(102.5, 5),
        maxE1RMAt: at(11, 12),
      },
    ])
  })

  it('telt een gewicht zonder gehaalde rep niet als record', () => {
    const records = buildRecords([...history, session(at(11, 14), [['Squat', 150, [0, 0]]])])
    expect(records[0].maxWeight).toBe(102.5)
  })

  it('meldt een nieuw gewichtsrecord, maar niet bij de eerste keer', () => {
    expect(
      findNewRecords(history, [
        { name: 'Squat', weight: 105, repsDone: FIVES },
        { name: 'Deadlift', weight: 140, repsDone: [5] },
      ]),
    ).toEqual([{ name: 'Squat', kind: 'weight', value: 105, previous: 102.5 }])
  })

  it('meldt een 1RM-record als het gewicht gelijk blijft maar je meer reps haalt', () => {
    const before = [session(at(11, 10), [['Squat', 100, [3, 3]]])]
    expect(findNewRecords(before, [{ name: 'Squat', weight: 100, repsDone: [5, 5] }])).toEqual([
      { name: 'Squat', kind: 'e1rm', value: 116.7, previous: 110 },
    ])
    expect(findNewRecords(before, [{ name: 'Squat', weight: 100, repsDone: [3, 0] }])).toEqual([])
  })
})

describe('kalender en weken', () => {
  const history = [
    session(at(11, 13), [['Squat', 100, FIVES]]), // vrijdag deze week
    session(at(11, 9), [['Squat', 100, FIVES]]), // maandag deze week
    session(at(11, 4), [['Squat', 100, [5, 5]]]), // vorige week
    session(at(10, 20), [['Squat', 100, FIVES]]), // drie weken terug: gat ertussen
  ]

  it('laat de week op maandag beginnen', () => {
    expect(dayKey(startOfWeek(NOW))).toBe('2026-11-09')
    expect(dayKey(startOfWeek(new Date(2026, 10, 9)))).toBe('2026-11-09')
  })

  it('telt trainingen per week en maand en de reeks van weken', () => {
    expect(consistency(history, NOW)).toEqual({ thisWeek: 2, thisMonth: 3, total: 4, weekStreak: 2 })
  })

  it('breekt de reeks niet zolang de lopende week nog leeg is', () => {
    const monday = new Date(2026, 10, 16, 8)
    expect(consistency(history, monday).weekStreak).toBe(2)
    expect(consistency([], NOW).weekStreak).toBe(0)
  })

  it('bouwt een raster van weken met zeven dagen vanaf maandag', () => {
    const grid = calendarGrid(history, 2, new Date(2026, 10, 13, 20))
    expect(grid.map((w) => w[0].key)).toEqual(['2026-11-02', '2026-11-09'])
    expect(grid[1].map((d) => d.count)).toEqual([1, 0, 0, 0, 1, 0, 0])
    expect(grid[1].map((d) => d.future)).toEqual([false, false, false, false, false, true, true])
    expect(grid[0][2].count).toBe(1) // woensdag 4 november
  })

  it('telt het volume per week, lege weken als 0', () => {
    expect(weeklyVolume(history, 3, NOW)).toEqual([
      { weekStart: '2026-10-26', volume: 0, sessions: 0 },
      { weekStart: '2026-11-02', volume: 1000, sessions: 1 },
      { weekStart: '2026-11-09', volume: 5000, sessions: 2 },
    ])
  })
})

describe('lichaamsgewicht en aandachtspunten', () => {
  it('geeft ingevulde lichaamsgewichten oudste eerst', () => {
    const history = [
      session(at(11, 12), [], { body_weight: 81.5 }),
      session(at(11, 11), []),
      session(at(11, 10), [], { body_weight: 82 }),
    ]
    expect(bodyWeightSeries(history).map((p) => p.weight)).toEqual([82, 81.5])
  })

  it('signaleert vastlopen en verlagingen, en slaat overgeslagen oefeningen over', () => {
    const history = [
      session(at(11, 14), [
        ['Squat', 90, [5, 5, 4]],
        ['Bench Press', 60, FIVES],
        ['Row', 50, [0, 0]],
      ]),
      session(at(11, 12), [['Squat', 90, [5, 4, 4]]]),
      session(at(11, 10), [['Squat', 100, [4, 4, 3]]]),
    ]
    expect(exerciseHealth(history)).toEqual([{ name: 'Squat', weight: 90, failStreak: 2, drops: 1 }])
  })

  it('laat accessoires (stap 0) buiten de aandachtspunten', () => {
    const history = [
      session(at(11, 12), [
        ['Squat', 100, [5, 4, 3]],
        ['Barbell Curl', 25, [5, 4, 3]],
      ]),
    ]
    const increments = new Map([
      ['Squat', 2.5],
      ['Barbell Curl', 0],
    ])
    expect(exerciseHealth(history, increments).map((h) => h.name)).toEqual(['Squat'])
    // zonder stappen weten we niet welke accessoires zijn; bij gelijke stand telt de naam
    expect(exerciseHealth(history).map((h) => h.name)).toEqual(['Barbell Curl', 'Squat'])
  })

  it('zet oefeningen die echt veranderen vóór vlakke lijnen bij evenveel metingen', () => {
    const history = [
      session(at(11, 12), [['Barbell Curl', 25, FIVES], ['Squat', 102.5, FIVES]]),
      session(at(11, 10), [['Barbell Curl', 25, FIVES], ['Squat', 100, FIVES]]),
    ]
    expect(buildSeries(history).map((s) => s.name)).toEqual(['Squat', 'Barbell Curl'])
  })
})

describe('schijven', () => {
  it('verdeelt het gewicht over de zwaarste schijven per kant', () => {
    expect(platesPerSide(102.5, 20)).toEqual({ perSide: [25, 15, 1.25], remainder: 0 })
    expect(platesPerSide(60, 20)).toEqual({ perSide: [20], remainder: 0 })
    expect(formatPlates(platesPerSide(102.5, 20)!)).toBe('25 + 15 + 1,25')
  })

  it('meldt wat niet past en geeft null tot en met de lege stang', () => {
    expect(platesPerSide(61, 20)).toEqual({ perSide: [20], remainder: 0.5 })
    expect(platesPerSide(20, 20)).toBeNull()
    expect(platesPerSide(null, 20)).toBeNull()
  })

  it('gebruikt alleen de schijven die er zijn', () => {
    expect(platesPerSide(70, 20, [20, 10, 5])).toEqual({ perSide: [20, 5], remainder: 0 })
  })
})

describe('export en opmaak', () => {
  it('maakt een CSV met puntkomma, decimale komma en veilige tekst', () => {
    const csv = sessionsToCsv([
      session(at(11, 12, 18), [['Squat', 102.5, [5, 5, 4]]], {
        body_weight: 81.5,
        note: '=SOM(A1) "zwaar"; ging goed',
      }),
    ])
    const [header, row] = csv.split('\r\n')
    expect(header.split(';')).toHaveLength(14)
    expect(row).toBe(
      '2026-11-12;18:00;18:00;Workout A;Squat;3;5;102,5;5/5/4;14;1435;119,6;81,5;' +
        '"\'=SOM(A1) ""zwaar""; ging goed"',
    )
  })

  it('zet sessies oudste eerst en geeft zonder sessies alleen de kop', () => {
    const csv = sessionsToCsv([
      session(at(11, 12), [['Squat', 100, [5]]]),
      session(at(11, 10), [['Squat', 95, [5]]]),
    ])
    expect(csv.split('\r\n').map((l) => l.split(';')[0])).toEqual(['Datum', '2026-11-10', '2026-11-12'])
    expect(sessionsToCsv([]).split('\r\n')).toHaveLength(1)
  })

  it('formatteert volume en korte datums', () => {
    expect(formatKg(12450.4)).toBe('12.450 kg')
    expect(formatKg(950)).toBe('950 kg')
    expect(formatShortDate('2026-11-03')).toBe('3 nov')
  })
})
