import { describe, expect, it } from 'vitest'
import type { Session } from '../domain/session'
import { csvCell, sessionsToCsv } from './csv'

const base = { mode: 'simple' as const, createdAt: 't', updatedAt: 't' }

describe('sessionsToCsv', () => {
  it('writes a header and one row per session with exact decimals', () => {
    const sessions: Session[] = [
      { ...base, id: 'a', date: '2026-11-01', netCents: 5025, gameType: "No-Limit Hold'em", durationMinutes: 180 },
      { ...base, id: 'b', date: '2026-11-02', netCents: -2500 },
    ]
    expect(sessionsToCsv(sessions)).toBe(
      'Date,Net Result,Game Type,Duration (minutes),Notes\r\n' +
        "2026-11-01,50.25,No-Limit Hold'em,180,\r\n" +
        '2026-11-02,-25.00,,,\r\n',
    )
  })

  it('quotes commas, quotes and newlines in notes', () => {
    const s: Session = { ...base, id: 'a', date: '2026-11-01', netCents: 0, notes: 'Tight, then "loose"\nlate' }
    expect(sessionsToCsv([s]).split('\r\n')[1]).toBe('2026-11-01,0.00,,,"Tight, then ""loose""\nlate"')
  })

  it('neutralizes spreadsheet formulas in text cells', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('-25.00', { isText: false })).toBe('-25.00')
  })
})
