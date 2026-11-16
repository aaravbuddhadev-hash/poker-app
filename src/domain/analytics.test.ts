import { describe, expect, it } from 'vitest'
import {
  cumulativeSeries,
  filterSessions,
  gameTypeBreakdown,
  inRange,
  monthlyTotals,
  mostActiveMonth,
  mostCommonGameType,
  rangeStart,
  sortSessions,
  summarize,
} from './analytics'
import type { Session } from './session'

let seq = 0
function s(date: string, netCents: number, extra: Partial<Session> = {}): Session {
  seq++
  return {
    id: `id${seq}`,
    date,
    mode: 'simple',
    netCents,
    createdAt: `2026-01-01T00:00:${String(seq).padStart(2, '0')}.000Z`,
    updatedAt: 'x',
    ...extra,
  }
}

const today = '2026-11-15'

describe('summarize', () => {
  it('handles no sessions without inventing numbers', () => {
    const sum = summarize([])
    expect(sum).toMatchObject({ count: 0, netCents: 0, positiveRate: null, averageCents: null, best: null, worst: null })
  })

  it('computes lifetime totals and records', () => {
    const big = s('2026-11-01', 32550, { durationMinutes: 240 })
    const bad = s('2026-11-02', -14000, { durationMinutes: 90 })
    const list = [big, bad, s('2026-11-03', 0), s('2026-11-04', 2500, { durationMinutes: 150 })]
    const sum = summarize(list)
    expect(sum.count).toBe(4)
    expect(sum.netCents).toBe(21050)
    expect([sum.positive, sum.negative, sum.even]).toEqual([2, 1, 1])
    expect(sum.positiveRate).toBe(0.5)
    expect(sum.averageCents).toBe(5263) // 21050 / 4 = 5262.5 -> rounds away from zero
    expect(sum.best).toBe(big)
    expect(sum.worst).toBe(bad)
    expect(sum.totalMinutes).toBe(480)
    expect(sum.timedCount).toBe(3)
    expect(sum.averageMinutes).toBe(160)
    expect(sum.longest).toBe(big)
  })

  it('reports no best session when every session lost', () => {
    const sum = summarize([s(today, -100), s(today, -200)])
    expect(sum.best).toBeNull()
    expect(sum.worst?.netCents).toBe(-200)
    expect(sum.averageCents).toBe(-150)
  })
})

describe('date ranges', () => {
  it('computes inclusive range starts', () => {
    expect(rangeStart('7d', today)).toBe('2026-11-09')
    expect(rangeStart('30d', today)).toBe('2026-10-17')
    expect(rangeStart('90d', today)).toBe('2026-08-18')
    expect(rangeStart('ytd', today)).toBe('2026-01-01')
    expect(rangeStart('all', today)).toBeNull()
  })

  it('filters sessions to a range, including both ends', () => {
    const list = [s('2026-11-08', 1), s('2026-11-09', 2), s('2026-11-15', 3), s('2025-12-31', 4)]
    expect(inRange(list, '7d', today).map((x) => x.netCents)).toEqual([2, 3])
    expect(inRange(list, 'ytd', today).map((x) => x.netCents)).toEqual([1, 2, 3])
    expect(inRange(list, 'all', today)).toHaveLength(4)
  })
})

describe('cumulativeSeries', () => {
  it('groups by day and keeps a running total in date order', () => {
    const list = [s('2026-11-03', -500), s('2026-11-01', 1000), s('2026-11-01', 250)]
    expect(cumulativeSeries(list)).toEqual([
      { date: '2026-11-01', dayCents: 1250, cumulativeCents: 1250, sessions: 2 },
      { date: '2026-11-03', dayCents: -500, cumulativeCents: 750, sessions: 1 },
    ])
  })
})

describe('monthly statistics', () => {
  const list = [
    s('2026-09-30', 1000, { durationMinutes: 60 }),
    s('2026-10-01', -300),
    s('2026-10-15', 700, { durationMinutes: 30 }),
    s('2026-11-02', 100),
  ]
  it('totals each month', () => {
    expect(monthlyTotals(list)).toEqual([
      { month: '2026-09', netCents: 1000, count: 1, minutes: 60 },
      { month: '2026-10', netCents: 400, count: 2, minutes: 30 },
      { month: '2026-11', netCents: 100, count: 1, minutes: 0 },
    ])
  })
  it('finds the most active month, ties going to the earlier one', () => {
    expect(mostActiveMonth(list)?.month).toBe('2026-10')
    expect(mostActiveMonth([s('2026-01-01', 0), s('2026-02-01', 0)])?.month).toBe('2026-01')
    expect(mostActiveMonth([])).toBeNull()
  })
})

describe('game types', () => {
  it('breaks results down by game type', () => {
    const list = [
      s(today, 1000, { gameType: 'Tournament' }),
      s(today, -400, { gameType: 'Tournament' }),
      s(today, 50, { gameType: 'Home Game' }),
      s(today, 10),
    ]
    const rows = gameTypeBreakdown(list)
    expect(rows[0]).toEqual({ gameType: 'Tournament', count: 2, netCents: 600, averageCents: 300, positiveRate: 0.5 })
    expect(rows.map((r) => r.gameType)).toEqual(['Tournament', 'Home Game', 'Unspecified'])
    expect(mostCommonGameType(list)).toBe('Tournament')
    expect(mostCommonGameType([s(today, 1)])).toBeNull()
  })
})

describe('filter and sort', () => {
  const a = s('2026-11-01', 5000, { gameType: 'Tournament', notes: 'Final table!' })
  const b = s('2026-11-05', -2500, { gameType: 'Home Game', notes: 'Tilted after a bad beat' })
  const c = s('2026-11-10', 0)
  const list = [a, b, c]

  it('filters by date range, game type, outcome and note text', () => {
    expect(filterSessions(list, { from: '2026-11-02', to: '2026-11-10' })).toEqual([b, c])
    expect(filterSessions(list, { gameType: 'Tournament' })).toEqual([a])
    expect(filterSessions(list, { gameType: 'Unspecified' })).toEqual([c])
    expect(filterSessions(list, { outcome: 'negative' })).toEqual([b])
    expect(filterSessions(list, { outcome: 'even' })).toEqual([c])
    expect(filterSessions(list, { query: 'BAD BEAT' })).toEqual([b])
  })

  it('sorts four ways', () => {
    expect(sortSessions(list, 'newest')).toEqual([c, b, a])
    expect(sortSessions(list, 'oldest')).toEqual([a, b, c])
    expect(sortSessions(list, 'highest')).toEqual([a, c, b])
    expect(sortSessions(list, 'lowest')).toEqual([b, c, a])
  })
})
