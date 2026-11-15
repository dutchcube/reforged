import { describe, expect, it } from 'vitest'
import { defaultIncrement, isSuccess, nextProgression, roundToStep } from './progression'

const base = { weight: 100, increment: 2.5, failCount: 0, targetReps: 5 }

describe('roundToStep', () => {
  it('rondt af op veelvouden van 2,5', () => {
    expect(roundToStep(90)).toBe(90)
    expect(roundToStep(91)).toBe(90)
    expect(roundToStep(91.3)).toBe(92.5)
    expect(roundToStep(20.25)).toBe(20)
  })

  it('laat het gewicht staan bij een stap van 0', () => {
    expect(roundToStep(91.3, 0)).toBe(91.3)
  })
})

describe('isSuccess', () => {
  it('is waar als elke set het doel haalt', () => {
    expect(isSuccess([5, 5, 5, 5, 5], 5)).toBe(true)
  })

  it('is onwaar bij een gemiste rep of een niet-aangetikte set', () => {
    expect(isSuccess([5, 5, 5, 5, 4], 5)).toBe(false)
    expect(isSuccess([5, 5, 5, 5, null], 5)).toBe(false)
  })

  it('is onwaar zonder sets', () => {
    expect(isSuccess([], 5)).toBe(false)
  })
})

describe('defaultIncrement', () => {
  it('geeft deadlift 5 kg en de rest 2,5 kg', () => {
    expect(defaultIncrement('Deadlift')).toBe(5)
    expect(defaultIncrement('romanian dead lift')).toBe(5)
    expect(defaultIncrement('Squat')).toBe(2.5)
    expect(defaultIncrement('')).toBe(2.5)
  })
})

describe('nextProgression', () => {
  it('verhoogt het gewicht na een geslaagde sessie en zet de teller op 0', () => {
    expect(nextProgression({ ...base, failCount: 2, repsDone: [5, 5, 5, 5, 5] })).toEqual({
      weight: 102.5,
      failCount: 0,
      outcome: 'up',
    })
  })

  it('gebruikt de stap van de oefening', () => {
    const result = nextProgression({ ...base, increment: 5, targetReps: 5, repsDone: [5] })
    expect(result.weight).toBe(105)
  })

  it('laat een accessoire-oefening (stap 0) altijd ongemoeid', () => {
    expect(nextProgression({ ...base, increment: 0, repsDone: [5, 5, 5, 5, 5] })).toEqual({
      weight: 100,
      failCount: 0,
      outcome: 'none',
    })
    // ook na herhaald missen volgt er geen deload
    expect(
      nextProgression({ ...base, increment: 0, failCount: 2, repsDone: [5, 4, 3, 0, 0] }),
    ).toEqual({ weight: 100, failCount: 2, outcome: 'none' })
  })

  it('houdt het gewicht vast en telt de mislukte sessie', () => {
    expect(nextProgression({ ...base, repsDone: [5, 5, 5, 4, 3] })).toEqual({
      weight: 100,
      failCount: 1,
      outcome: 'hold',
    })
  })

  it('telt een niet-aangetikte set als mislukt', () => {
    expect(nextProgression({ ...base, repsDone: [5, 5, 5, 5, null] }).failCount).toBe(1)
  })

  it('gaat 10% omlaag na de derde mislukte sessie op rij', () => {
    expect(nextProgression({ ...base, failCount: 2, repsDone: [5, 4, 4, 3, 3] })).toEqual({
      weight: 90,
      failCount: 0,
      outcome: 'deload',
    })
  })

  it('rondt de deload af op 2,5 kg', () => {
    const result = nextProgression({ ...base, weight: 102.5, failCount: 2, repsDone: [4] })
    expect(result.weight).toBe(92.5) // 92,25 -> 92,5
  })

  it('verandert niets aan een overgeslagen oefening', () => {
    expect(nextProgression({ ...base, failCount: 2, repsDone: [null, null, null] })).toEqual({
      weight: 100,
      failCount: 2,
      outcome: 'none',
    })
  })

  it('verandert niets aan een oefening zonder gewicht', () => {
    expect(nextProgression({ ...base, weight: null, repsDone: [5, 5, 5] })).toEqual({
      weight: null,
      failCount: 0,
      outcome: 'none',
    })
  })

  it('heeft geen last van drijvende-kommaruis', () => {
    const result = nextProgression({ ...base, weight: 0.1, increment: 0.2, repsDone: [5] })
    expect(result.weight).toBe(0.3)
  })
})
