import { describe, expect, it } from 'vitest'
import { nextSetValue, type SetValue } from './setCircle'

describe('nextSetValue', () => {
  it('eerste tik zet de set op het doel', () => {
    expect(nextSetValue(null, 5)).toBe(5)
  })

  it('elke volgende tik haalt er één rep af', () => {
    expect(nextSetValue(5, 5)).toBe(4)
    expect(nextSetValue(1, 5)).toBe(0)
  })

  it('tik bij 0 zet de set terug naar onaangetikt', () => {
    expect(nextSetValue(0, 5)).toBeNull()
  })

  it('loopt in doel + 2 tikken de hele cirkel rond', () => {
    const seen: SetValue[] = []
    let value: SetValue = null
    for (let i = 0; i < 7; i++) {
      value = nextSetValue(value, 5)
      seen.push(value)
    }
    expect(seen).toEqual([5, 4, 3, 2, 1, 0, null])
  })
})
