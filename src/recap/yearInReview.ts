/**
 * Year in Review numbers. Everything comes from records the user saved; when
 * there isn't enough data for a stat it is null, and the slide is skipped,
 * so the recap never shows an invented number.
 */
import { gameTypeBreakdown, mostActiveMonth, monthlyTotals, outcomeOf, compareChronological, summarize, type MonthTotal, type Outcome } from '../domain/analytics'
import type { Session } from '../domain/session'
import type { IsoDate } from '../lib/dates'
import { formatDuration, formatMonth } from '../lib/dates'
import { formatMoney, type CurrencyCode } from '../lib/money'
import type { Submission } from '../puzzle/scoring'
import type { QuizAttempt } from '../quiz/stats'

export interface RecapInput {
  year: number
  today: IsoDate
  sessions: readonly Session[]
  puzzles: Record<string, Submission>
  quizAttempts: readonly QuizAttempt[]
  /** Lessons have no completion dates, so these are all-time totals (labeled as such). */
  lessonsCompleted: number
  totalLessons: number
  achievementsUnlocked: number
  achievementsTotal: number
}

export interface Recap {
  year: number
  isYearToDate: boolean
  sessions: {
    count: number
    netCents: number
    positive: number
    negative: number
    even: number
    positiveRate: number | null
    totalMinutes: number
    averageMinutes: number | null
    best: Session | null
    worst: Session | null
    mostActiveMonth: MonthTotal | null
    topGameType: { gameType: string; count: number } | null
    /** Jan..Dec (or Jan..this month for the current year), zero-filled. */
    months: MonthTotal[]
    /** Outcome of every session, oldest first. */
    outcomes: Outcome[]
  }
  learning: {
    puzzlesCompleted: number
    puzzleAccuracy: number | null
    questionsAnswered: number
    quizAccuracy: number | null
    lessonsCompleted: number
    totalLessons: number
    achievementsUnlocked: number
    achievementsTotal: number
  }
  hasSessions: boolean
  hasLearning: boolean
}

export function buildRecap(i: RecapInput): Recap {
  const prefix = String(i.year)
  const inYear = i.sessions.filter((s) => s.date.startsWith(prefix)).sort(compareChronological)
  const sum = summarize(inYear)
  const isYearToDate = i.today.startsWith(prefix)
  const lastMonth = isYearToDate ? Number(i.today.slice(5, 7)) : 12
  const byMonth = new Map(monthlyTotals(inYear).map((m) => [m.month, m]))
  const months = Array.from({ length: lastMonth }, (_, k) => {
    const key = `${prefix}-${String(k + 1).padStart(2, '0')}`
    return byMonth.get(key) ?? { month: key, netCents: 0, count: 0, minutes: 0 }
  })
  const top = gameTypeBreakdown(inYear.filter((s) => s.gameType))[0]

  const puzzleDates = Object.keys(i.puzzles).filter((d) => d.startsWith(prefix))
  const puzzleAccuracy = puzzleDates.length ? puzzleDates.reduce((a, d) => a + i.puzzles[d].accuracy, 0) / puzzleDates.length : null
  const attempts = i.quizAttempts.filter((a) => a.finishedAt.startsWith(prefix))
  const answered = attempts.reduce((n, a) => n + a.results.length, 0)
  const right = attempts.reduce((n, a) => n + a.results.filter((r) => r.correct).length, 0)

  return {
    year: i.year,
    isYearToDate,
    sessions: {
      count: sum.count,
      netCents: sum.netCents,
      positive: sum.positive,
      negative: sum.negative,
      even: sum.even,
      positiveRate: sum.positiveRate,
      totalMinutes: sum.totalMinutes,
      averageMinutes: sum.averageMinutes,
      best: sum.best,
      worst: sum.worst,
      mostActiveMonth: mostActiveMonth(inYear),
      topGameType: top ? { gameType: top.gameType, count: top.count } : null,
      months,
      outcomes: inYear.map((s) => outcomeOf(s.netCents)),
    },
    learning: {
      puzzlesCompleted: puzzleDates.length,
      puzzleAccuracy: puzzleAccuracy === null ? null : Math.round(puzzleAccuracy * 10) / 10,
      questionsAnswered: answered,
      quizAccuracy: answered ? right / answered : null,
      lessonsCompleted: i.lessonsCompleted,
      totalLessons: i.totalLessons,
      achievementsUnlocked: i.achievementsUnlocked,
      achievementsTotal: i.achievementsTotal,
    },
    hasSessions: sum.count > 0,
    hasLearning: puzzleDates.length > 0 || answered > 0 || i.lessonsCompleted > 0,
  }
}

/** Years worth offering: any year with sessions, puzzles or quizzes, plus the current one. Newest first. */
export function recapYears(today: IsoDate, sessions: readonly Session[], puzzles: Record<string, Submission>, attempts: readonly QuizAttempt[]): number[] {
  const years = new Set<number>([Number(today.slice(0, 4))])
  for (const s of sessions) years.add(Number(s.date.slice(0, 4)))
  for (const d of Object.keys(puzzles)) years.add(Number(d.slice(0, 4)))
  for (const a of attempts) years.add(Number(a.finishedAt.slice(0, 4)))
  return [...years].filter((y) => y <= Number(today.slice(0, 4))).sort((a, b) => b - a)
}

export interface SummaryLine {
  label: string
  value: string
}

/**
 * The stats on the shareable summary card. With `hideAmounts`, every money
 * figure is left out entirely (not masked), so an exported card can't leak one.
 */
export function summaryLines(r: Recap, currency: CurrencyCode, hideAmounts: boolean): SummaryLine[] {
  const lines: SummaryLine[] = []
  const s = r.sessions
  if (r.hasSessions) {
    lines.push({ label: 'Sessions', value: String(s.count) })
    if (!hideAmounts) lines.push({ label: 'Net result', value: formatMoney(s.netCents, currency, { signed: true }) })
    if (s.positiveRate !== null) lines.push({ label: 'Positive sessions', value: `${Math.round(s.positiveRate * 100)}%` })
    if (s.totalMinutes) lines.push({ label: 'Hours recorded', value: (s.totalMinutes / 60).toFixed(1) })
    if (s.mostActiveMonth) lines.push({ label: 'Most active month', value: formatMonth(s.mostActiveMonth.month, true).split(' ')[0] })
    if (s.topGameType) lines.push({ label: 'Favorite game', value: s.topGameType.gameType })
    if (!hideAmounts && s.best) lines.push({ label: 'Biggest session', value: formatMoney(s.best.netCents, currency, { signed: true }) })
    else if (s.averageMinutes) lines.push({ label: 'Average session', value: formatDuration(s.averageMinutes) })
  }
  const l = r.learning
  if (l.puzzlesCompleted) lines.push({ label: 'Daily puzzles', value: `${l.puzzlesCompleted} · ${l.puzzleAccuracy!.toFixed(0)}% accuracy` })
  if (l.questionsAnswered) lines.push({ label: 'Quiz answers', value: `${l.questionsAnswered} · ${Math.round(l.quizAccuracy! * 100)}% right` })
  if (l.achievementsUnlocked) lines.push({ label: 'Achievements', value: `${l.achievementsUnlocked} of ${l.achievementsTotal}` })
  return lines
}
