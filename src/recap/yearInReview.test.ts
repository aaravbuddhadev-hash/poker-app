import { describe, expect, it } from 'vitest'
import type { Session } from '../domain/session'
import type { Submission } from '../puzzle/scoring'
import type { QuizAttempt } from '../quiz/stats'
import { buildRecap, recapYears, summaryLines, type RecapInput } from './yearInReview'

let n = 0
const s = (date: string, netCents: number, extra: Partial<Session> = {}): Session => ({
  id: `s${++n}`,
  date,
  mode: 'simple',
  netCents,
  createdAt: `${date}T10:00:00.000Z`,
  updatedAt: 'x',
  ...extra,
})
const puzzle = (accuracy: number): Submission => ({
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
const quiz = (finishedAt: string, correct: boolean[]): QuizAttempt => ({
  id: finishedAt,
  finishedAt,
  mode: 'rules',
  difficulty: 'beginner',
  results: correct.map((c, i) => ({ questionId: `q${i}`, category: 'rules', correct: c })),
})

const base: RecapInput = {
  year: 2026,
  today: '2026-11-16',
  sessions: [
    s('2025-12-30', 99999), // previous year: excluded
    s('2026-03-02', 12000, { gameType: 'Tournament', durationMinutes: 240 }),
    s('2026-03-15', -4550, { gameType: "No-Limit Hold'em", durationMinutes: 120 }),
    s('2026-03-20', 0, { gameType: "No-Limit Hold'em" }),
    s('2026-07-04', 2500, { gameType: "No-Limit Hold'em", durationMinutes: 60 }),
  ],
  puzzles: { '2026-11-15': puzzle(90), '2026-11-16': puzzle(80), '2025-12-31': puzzle(10) },
  quizAttempts: [quiz('2026-11-16T12:00:00Z', [true, true, true, false, true]), quiz('2025-06-01T00:00:00Z', [false])],
  lessonsCompleted: 4,
  totalLessons: 9,
  achievementsUnlocked: 3,
  achievementsTotal: 10,
}

describe('buildRecap', () => {
  it('summarizes only the chosen year', () => {
    const r = buildRecap(base)
    expect(r.isYearToDate).toBe(true)
    expect(r.sessions.count).toBe(4)
    expect(r.sessions.netCents).toBe(9950)
    expect([r.sessions.positive, r.sessions.negative, r.sessions.even]).toEqual([2, 1, 1])
    expect(r.sessions.positiveRate).toBe(0.5)
    expect(r.sessions.totalMinutes).toBe(420)
    expect(r.sessions.averageMinutes).toBe(140)
    expect(r.sessions.best?.netCents).toBe(12000)
    expect(r.sessions.worst?.netCents).toBe(-4550)
    expect(r.sessions.mostActiveMonth).toMatchObject({ month: '2026-03', count: 3 })
    expect(r.sessions.topGameType).toEqual({ gameType: "No-Limit Hold'em", count: 3 })
    expect(r.sessions.outcomes).toEqual(['positive', 'negative', 'even', 'positive'])
  })

  it('zero-fills months up to today for the current year, all 12 for past years', () => {
    expect(buildRecap(base).sessions.months).toHaveLength(11)
    expect(buildRecap(base).sessions.months[2]).toMatchObject({ month: '2026-03', count: 3 })
    expect(buildRecap({ ...base, year: 2025 }).sessions.months).toHaveLength(12)
    expect(buildRecap({ ...base, year: 2025 }).isYearToDate).toBe(false)
  })

  it('counts learning for the year', () => {
    const l = buildRecap(base).learning
    expect(l.puzzlesCompleted).toBe(2)
    expect(l.puzzleAccuracy).toBe(85)
    expect(l.questionsAnswered).toBe(5)
    expect(l.quizAccuracy).toBe(0.8)
  })

  it('reports missing data as null instead of inventing it', () => {
    const r = buildRecap({ ...base, year: 2024, lessonsCompleted: 0, achievementsUnlocked: 0 })
    expect(r.hasSessions).toBe(false)
    expect(r.hasLearning).toBe(false)
    expect(r.sessions.best).toBeNull()
    expect(r.sessions.mostActiveMonth).toBeNull()
    expect(r.sessions.positiveRate).toBeNull()
    expect(r.learning.puzzleAccuracy).toBeNull()
    expect(r.learning.quizAccuracy).toBeNull()
    expect(summaryLines(r, 'USD', false)).toEqual([])
  })
})

describe('summary card', () => {
  it('includes money when allowed', () => {
    const lines = summaryLines(buildRecap(base), 'USD', false)
    expect(lines).toContainEqual({ label: 'Net result', value: '+$99.50' })
    expect(lines).toContainEqual({ label: 'Biggest session', value: '+$120.00' })
    expect(lines).toContainEqual({ label: 'Most active month', value: 'March' })
  })

  it('leaves out every money figure when amounts are hidden', () => {
    const lines = summaryLines(buildRecap(base), 'USD', true)
    expect(lines.some((l) => /\$/.test(l.value))).toBe(false)
    expect(lines.map((l) => l.label)).not.toContain('Net result')
    expect(lines).toContainEqual({ label: 'Average session', value: '2h 20m' })
  })
})

describe('recapYears', () => {
  it('offers the current year and any year with activity, newest first', () => {
    expect(recapYears('2026-11-16', base.sessions, base.puzzles, base.quizAttempts)).toEqual([2026, 2025])
    expect(recapYears('2026-01-01', [], {}, [])).toEqual([2026])
  })
})
