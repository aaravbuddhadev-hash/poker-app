import { describe, expect, it } from 'vitest'
import { isSession, validateSessionInput } from './session'

const today = '2026-11-15'

describe('validateSessionInput', () => {
  it('accepts positive, negative and zero results in simple mode', () => {
    for (const netCents of [5000, -2500, 0]) {
      const r = validateSessionInput({ date: today, mode: 'simple', netCents }, today)
      expect(r).toEqual({ ok: true, value: { date: today, mode: 'simple', netCents } })
    }
  })

  it('computes net = end - start in detailed mode, ignoring any typed net', () => {
    const r = validateSessionInput(
      { date: today, mode: 'detailed', netCents: 999999, startCents: 20000, endCents: 13550 },
      today,
    )
    expect(r.ok && r.value).toEqual({ date: today, mode: 'detailed', netCents: -6450, startCents: 20000, endCents: 13550 })
  })

  it('requires start and end amounts in detailed mode', () => {
    const r = validateSessionInput({ date: today, mode: 'detailed', netCents: 0, startCents: 100 }, today)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errors.endCents).toBeTruthy()
  })

  it('rejects future dates and invalid dates', () => {
    expect(validateSessionInput({ date: '2026-11-16', mode: 'simple', netCents: 0 }, today).ok).toBe(false)
    expect(validateSessionInput({ date: '2026-02-30', mode: 'simple', netCents: 0 }, today).ok).toBe(false)
  })

  it('validates duration, game type and notes', () => {
    const bad = validateSessionInput(
      // @ts-expect-error testing a bad game type from untrusted input
      { date: today, mode: 'simple', netCents: 0, durationMinutes: 0, gameType: 'Blackjack', notes: 'x'.repeat(2001) },
      today,
    )
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(['durationMinutes', 'gameType', 'notes'])
  })

  it('trims notes and drops empty ones', () => {
    const r = validateSessionInput({ date: today, mode: 'simple', netCents: 0, notes: '   ' }, today)
    expect(r.ok && r.value.notes).toBeUndefined()
  })

  it('rejects non-integer cents', () => {
    expect(validateSessionInput({ date: today, mode: 'simple', netCents: 10.5 }, today).ok).toBe(false)
  })
})

describe('isSession', () => {
  it('rejects malformed stored records', () => {
    expect(isSession({ id: 'a', date: today, mode: 'simple', netCents: 1, createdAt: 't', updatedAt: 't' })).toBe(true)
    expect(isSession({ id: 'a', date: today, mode: 'simple', netCents: '1', createdAt: 't', updatedAt: 't' })).toBe(false)
    expect(isSession(null)).toBe(false)
  })
})
