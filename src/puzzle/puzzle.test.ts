import { describe, expect, it } from 'vitest'
import { addDays } from '../lib/dates'
import { parseCards } from '../poker/cards'
import { calculateEquity } from '../poker/equity'
import { FIRST_PUZZLE_DATE, msUntilNextPuzzle, puzzleForDate, puzzleNumber, utcDateKey } from './daily'
import { explainPuzzle, riverOutcomes } from './explain'
import { accuracy, evenSplit, puzzleStats, rebalance, type Submission } from './scoring'

describe('daily puzzle', () => {
  it('is the same every time for a date (refresh-safe, same for everyone)', () => {
    expect(puzzleForDate('2026-11-20')).toEqual(puzzleForDate('2026-11-20'))
    expect(puzzleForDate('2026-11-20')).not.toEqual(puzzleForDate('2026-11-21'))
  })

  it('uses the UTC day boundary', () => {
    // 11:30pm in Los Angeles on Nov 15 is already Nov 16 in UTC.
    expect(utcDateKey(new Date('2026-11-15T23:30:00-08:00'))).toBe('2026-11-16')
    expect(utcDateKey(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16')
    expect(msUntilNextPuzzle(new Date('2026-11-16T23:00:00Z'))).toBe(3_600_000)
  })

  it('numbers puzzles from launch day', () => {
    expect(puzzleNumber(FIRST_PUZZLE_DATE)).toBe(1)
    expect(puzzleNumber('2026-11-24')).toBe(10)
  })

  it('rotates situations and never repeats a card, across 60 days', () => {
    const kinds = new Set<string>()
    let date = FIRST_PUZZLE_DATE
    for (let i = 0; i < 60; i++) {
      const p = puzzleForDate(date)
      kinds.add(`${p.kind}-${p.hands.length}`)
      const cards = [...p.hands.flat(), ...p.board]
      expect(new Set(cards).size).toBe(cards.length)
      expect(p.board.length).toBe({ preflop: 0, flop: 3, turn: 4 }[p.kind])
      date = addDays(date, 1)
    }
    expect([...kinds].sort()).toEqual(['flop-2', 'flop-3', 'preflop-2', 'preflop-3', 'turn-2'])
  })

  it('keeps postflop puzzles competitive', () => {
    let date = FIRST_PUZZLE_DATE
    for (let i = 0; i < 30; i++) {
      const p = puzzleForDate(date)
      if (p.kind !== 'preflop') {
        const eq = calculateEquity({ hands: p.hands, board: p.board }).players.map((x) => x.equity)
        expect(Math.min(...eq)).toBeGreaterThan(0.05)
        expect(Math.max(...eq)).toBeLessThan(0.95)
      }
      date = addDays(date, 1)
    }
  })

  it('rejects invalid dates', () => {
    expect(() => puzzleForDate('2026-02-30')).toThrow()
  })
})

describe('scoring', () => {
  it('scores a perfect guess as 100 and measures misplaced points', () => {
    expect(accuracy([82, 18], [0.82, 0.18])).toBe(100)
    expect(accuracy([70, 30], [0.82, 0.18])).toBe(88)
    expect(accuracy([50, 30, 20], [0.4, 0.4, 0.2])).toBe(90)
    expect(accuracy([100, 0], [0, 1])).toBe(0)
  })

  it('splits evenly and rebalances to exactly 100 in whole points', () => {
    expect(evenSplit(2)).toEqual([50, 50])
    expect(evenSplit(3)).toEqual([34, 33, 33])
    expect(rebalance([50, 50], 0, 73)).toEqual([73, 27])
    expect(rebalance([34, 33, 33], 0, 60)).toEqual([60, 20, 20])
    expect(rebalance([60, 30, 10], 2, 40)).toEqual([40, 20, 40])
    expect(rebalance([100, 0, 0], 0, 40)).toEqual([40, 30, 30])
    for (const v of [0, 1, 33, 99, 100, 150, -5]) expect(rebalance([20, 50, 30], 1, v).reduce((a, b) => a + b)).toBe(100)
  })

  const sub = (accuracy: number): Submission => ({
    kind: 'flop',
    players: 2,
    prediction: [50, 50],
    equity: [0.5, 0.5],
    win: [0.5, 0.5],
    tie: [0, 0],
    splitRate: 0,
    accuracy,
    submittedAt: 'x',
  })

  it('computes streaks, averages and best prediction', () => {
    const subs = {
      '2026-11-01': sub(80),
      '2026-11-02': sub(90),
      '2026-11-03': sub(70),
      '2026-11-05': sub(95),
      '2026-11-06': sub(85),
    }
    const s = puzzleStats(subs, '2026-11-07')
    expect(s.completed).toBe(5)
    expect(s.longestStreak).toBe(3)
    expect(s.currentStreak).toBe(2) // through yesterday; today not played yet
    expect(s.averageAccuracy).toBe(84)
    expect(s.best).toEqual({ date: '2026-11-05', accuracy: 95 })
    expect(puzzleStats(subs, '2026-11-08').currentStreak).toBe(0)
    expect(puzzleStats({ ...subs, '2026-11-07': sub(60) }, '2026-11-07').currentStreak).toBe(3)
    expect(puzzleStats({}, '2026-11-07')).toEqual({ completed: 0, currentStreak: 0, longestStreak: 0, averageAccuracy: null, best: null })
  })
})

describe('explanations', () => {
  it('lists exact river outs for a turn puzzle', () => {
    const p = { date: '2026-11-15', number: 1, kind: 'turn' as const, hands: [parseCards('Ah Ad'), parseCards('Kc Ks')], board: parseCards('Qd 7c 2s Js') }
    const outs = riverOutcomes(p)
    expect(outs.find((g) => g.winners.join() === '1')?.cards.length).toBe(2)
    const r = calculateEquity({ hands: p.hands, board: p.board })
    const lines = explainPuzzle(p, r)
    expect(lines[0]).toBe('Player 1 is the favorite with 95.5% of the pot on average.')
    expect(lines.some((l) => l.startsWith('Player 2 wins on 2 of the 44 possible river cards: K♦ K♥.'))).toBe(true)
  })

  it('describes a preflop race with the computed number', () => {
    const p = { date: '2026-11-15', number: 1, kind: 'preflop' as const, hands: [parseCards('7c 7d'), parseCards('Ah Kh')], board: [] }
    const r = calculateEquity({ hands: p.hands, board: [] })
    const lines = explainPuzzle(p, r)
    expect(lines.some((l) => l.includes('classic “race”') && l.includes((r.players[0].equity * 100).toFixed(1)))).toBe(true)
    expect(lines).toContain('Player 2 is suited, which adds some flush chances.')
  })
})
