/**
 * Pure analytics over session records. No storage or React here, so every
 * number shown in the app can be unit-tested.
 */
import { addDays, monthKey, yearOf, type IsoDate } from '../lib/dates'
import { divideCents, sumCents, type Cents } from '../lib/money'
import type { GameType, Session } from './session'

export type Outcome = 'positive' | 'negative' | 'even'

export function outcomeOf(netCents: Cents): Outcome {
  return netCents > 0 ? 'positive' : netCents < 0 ? 'negative' : 'even'
}

/** Oldest first; same-day sessions keep the order they were recorded in. */
export function compareChronological(a: Session, b: Session): number {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}

export interface Summary {
  count: number
  netCents: Cents
  positive: number
  negative: number
  even: number
  /** Share of sessions with a positive result, 0..1, or null with no sessions. */
  positiveRate: number | null
  averageCents: Cents | null
  /** Session with the largest positive result, or null if none was positive. */
  best: Session | null
  /** Session with the largest negative result, or null if none was negative. */
  worst: Session | null
  totalMinutes: number
  /** Sessions that recorded a duration. */
  timedCount: number
  averageMinutes: number | null
  longest: Session | null
}

export function summarize(sessions: readonly Session[]): Summary {
  let positive = 0
  let negative = 0
  let even = 0
  let best: Session | null = null
  let worst: Session | null = null
  let longest: Session | null = null
  let totalMinutes = 0
  let timedCount = 0

  for (const s of sessions) {
    const o = outcomeOf(s.netCents)
    if (o === 'positive') {
      positive++
      if (!best || s.netCents > best.netCents) best = s
    } else if (o === 'negative') {
      negative++
      if (!worst || s.netCents < worst.netCents) worst = s
    } else even++
    if (s.durationMinutes) {
      totalMinutes += s.durationMinutes
      timedCount++
      if (!longest || s.durationMinutes > (longest.durationMinutes ?? 0)) longest = s
    }
  }

  const count = sessions.length
  const netCents = sumCents(sessions.map((s) => s.netCents))
  return {
    count,
    netCents,
    positive,
    negative,
    even,
    positiveRate: count ? positive / count : null,
    averageCents: count ? divideCents(netCents, count) : null,
    best,
    worst,
    totalMinutes,
    timedCount,
    averageMinutes: timedCount ? Math.round(totalMinutes / timedCount) : null,
    longest,
  }
}

export type RangeKey = '7d' | '30d' | '90d' | 'ytd' | 'all'

export const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  ytd: 'This year',
  all: 'All time',
}

/** First day included in a range (inclusive), or null for all time. */
export function rangeStart(range: RangeKey, today: IsoDate): IsoDate | null {
  switch (range) {
    case '7d':
      return addDays(today, -6)
    case '30d':
      return addDays(today, -29)
    case '90d':
      return addDays(today, -89)
    case 'ytd':
      return `${today.slice(0, 4)}-01-01`
    case 'all':
      return null
  }
}

export function inRange(sessions: readonly Session[], range: RangeKey, today: IsoDate): Session[] {
  const start = rangeStart(range, today)
  return sessions.filter((s) => (start === null || s.date >= start) && s.date <= today)
}

export interface SeriesPoint {
  date: IsoDate
  /** Net for that day alone. */
  dayCents: Cents
  /** Running total up to and including that day. */
  cumulativeCents: Cents
  sessions: number
}

/** Running total of net results, one point per day that has sessions. */
export function cumulativeSeries(sessions: readonly Session[]): SeriesPoint[] {
  const byDay = dailyTotals(sessions)
  const days = [...byDay.keys()].sort()
  let running = 0
  return days.map((date) => {
    const d = byDay.get(date)!
    running += d.netCents
    return { date, dayCents: d.netCents, cumulativeCents: running, sessions: d.count }
  })
}

export interface DayTotal {
  count: number
  netCents: Cents
}

export function dailyTotals(sessions: readonly Session[]): Map<IsoDate, DayTotal> {
  const map = new Map<IsoDate, DayTotal>()
  for (const s of sessions) {
    const d = map.get(s.date) ?? { count: 0, netCents: 0 }
    d.count++
    d.netCents += s.netCents
    map.set(s.date, d)
  }
  return map
}

export interface MonthTotal {
  month: string
  netCents: Cents
  count: number
  minutes: number
}

/** Totals per calendar month, oldest first. */
export function monthlyTotals(sessions: readonly Session[]): MonthTotal[] {
  const map = new Map<string, MonthTotal>()
  for (const s of sessions) {
    const key = monthKey(s.date)
    const m = map.get(key) ?? { month: key, netCents: 0, count: 0, minutes: 0 }
    m.netCents += s.netCents
    m.count++
    m.minutes += s.durationMinutes ?? 0
    map.set(key, m)
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}

/** Month with the most sessions; ties go to the earlier month. */
export function mostActiveMonth(sessions: readonly Session[]): MonthTotal | null {
  let best: MonthTotal | null = null
  for (const m of monthlyTotals(sessions)) if (!best || m.count > best.count) best = m
  return best
}

export interface GameTypeTotal {
  gameType: GameType | 'Unspecified'
  count: number
  netCents: Cents
  averageCents: Cents
  positiveRate: number
}

export function gameTypeBreakdown(sessions: readonly Session[]): GameTypeTotal[] {
  const groups = new Map<GameTypeTotal['gameType'], Session[]>()
  for (const s of sessions) {
    const key = s.gameType ?? 'Unspecified'
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  return [...groups.entries()]
    .map(([gameType, list]) => {
      const sum = summarize(list)
      return {
        gameType,
        count: sum.count,
        netCents: sum.netCents,
        averageCents: sum.averageCents ?? 0,
        positiveRate: sum.positiveRate ?? 0,
      }
    })
    .sort((a, b) => b.count - a.count || a.gameType.localeCompare(b.gameType))
}

export function mostCommonGameType(sessions: readonly Session[]): GameType | null {
  const top = gameTypeBreakdown(sessions.filter((s) => s.gameType))[0]
  return top ? (top.gameType as GameType) : null
}

export function sessionsInYear(sessions: readonly Session[], year: number): Session[] {
  return sessions.filter((s) => yearOf(s.date) === year)
}

export function yearsWithSessions(sessions: readonly Session[]): number[] {
  return [...new Set(sessions.map((s) => yearOf(s.date)))].sort((a, b) => b - a)
}

export interface SessionFilter {
  from?: IsoDate
  to?: IsoDate
  gameType?: GameType | 'Unspecified'
  outcome?: Outcome
  /** Case-insensitive match against notes and game type. */
  query?: string
}

export function filterSessions(sessions: readonly Session[], f: SessionFilter): Session[] {
  const q = f.query?.trim().toLowerCase()
  return sessions.filter((s) => {
    if (f.from && s.date < f.from) return false
    if (f.to && s.date > f.to) return false
    if (f.gameType && (s.gameType ?? 'Unspecified') !== f.gameType) return false
    if (f.outcome && outcomeOf(s.netCents) !== f.outcome) return false
    if (q && !`${s.notes ?? ''} ${s.gameType ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
}

export type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest'

export const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  highest: 'Highest net result',
  lowest: 'Lowest net result',
}

export function sortSessions(sessions: readonly Session[], key: SortKey): Session[] {
  const list = [...sessions]
  switch (key) {
    case 'newest':
      return list.sort((a, b) => compareChronological(b, a))
    case 'oldest':
      return list.sort(compareChronological)
    case 'highest':
      return list.sort((a, b) => b.netCents - a.netCents || compareChronological(b, a))
    case 'lowest':
      return list.sort((a, b) => a.netCents - b.netCents || compareChronological(b, a))
  }
}
