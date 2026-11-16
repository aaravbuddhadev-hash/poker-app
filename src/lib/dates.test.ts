import { describe, expect, it } from 'vitest'
import { addDays, dayOfWeek, daysInMonth, formatDuration, isIsoDate, todayIso } from './dates'

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2026-1-01')).toBe(false)
    expect(isIsoDate(20260101)).toBe(false)
  })

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09') // US DST start
    expect(addDays('2026-11-15', -29)).toBe('2026-10-17')
  })

  it('uses the local calendar day for today', () => {
    expect(todayIso(new Date(2026, 10, 15, 23, 59))).toBe('2026-11-15')
  })

  it('knows weekdays and month lengths', () => {
    expect(dayOfWeek('2026-11-15')).toBe(0) // Sunday
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(150)).toBe('2h 30m')
  })
})
