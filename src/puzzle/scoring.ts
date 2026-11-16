import { addDays, type IsoDate } from '../lib/dates'
import type { PuzzleKind } from './daily'

export interface Submission {
  kind: PuzzleKind
  players: number
  /** Predicted share of the pot per player, whole percentage points summing to 100. */
  prediction: number[]
  /** Exact equity per player, 0..1. */
  equity: number[]
  win: number[]
  tie: number[]
  splitRate: number
  /** 0..100, one decimal. */
  accuracy: number
  submittedAt: string
}

/**
 * Accuracy = 100 minus how many percentage points of the pot you put in the
 * wrong place (half the total absolute error). Heads-up this is simply
 * 100 minus how far off your number for either player was.
 */
export function accuracy(prediction: readonly number[], equity: readonly number[]): number {
  const misplaced = prediction.reduce((sum, p, i) => sum + Math.abs(p - equity[i] * 100), 0) / 2
  return Math.round(Math.max(0, 100 - misplaced) * 10) / 10
}

/** Even starting guess in whole points that sums to 100, e.g. [34, 33, 33]. */
export function evenSplit(n: number): number[] {
  const base = Math.floor(100 / n)
  return Array.from({ length: n }, (_, i) => base + (i < 100 - base * n ? 1 : 0))
}

/**
 * Set player `i` to `value` and rescale the others so the total stays 100,
 * keeping their proportions. Always returns whole numbers.
 */
export function rebalance(values: readonly number[], i: number, value: number): number[] {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const rest = 100 - v
  const others = values.map((_, j) => j).filter((j) => j !== i)
  const total = others.reduce((s, j) => s + values[j], 0)
  const raw = others.map((j) => (total === 0 ? rest / others.length : (values[j] * rest) / total))
  const floors = raw.map(Math.floor)
  let remainder = rest - floors.reduce((s, x) => s + x, 0)
  // Hand out leftover points to the largest fractional parts.
  const order = raw.map((r, k) => ({ k, frac: r - floors[k] })).sort((a, b) => b.frac - a.frac)
  for (const { k } of order) {
    if (remainder <= 0) break
    floors[k]++
    remainder--
  }
  const out = [...values]
  out[i] = v
  others.forEach((j, k) => (out[j] = floors[k]))
  return out
}

export interface PuzzleStats {
  completed: number
  currentStreak: number
  longestStreak: number
  averageAccuracy: number | null
  best: { date: IsoDate; accuracy: number } | null
}

/**
 * Streaks count consecutive UTC days with a submitted puzzle. The current
 * streak stays alive until the end of today, so a streak through yesterday
 * still counts while today's puzzle is unsolved.
 */
export function puzzleStats(submissions: Record<IsoDate, Submission>, today: IsoDate): PuzzleStats {
  const dates = Object.keys(submissions).sort()
  const has = new Set(dates)
  let longest = 0
  let run = 0
  let prev: IsoDate | null = null
  for (const d of dates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }
  let current = 0
  let day = has.has(today) ? today : addDays(today, -1)
  while (has.has(day)) {
    current++
    day = addDays(day, -1)
  }
  let best: PuzzleStats['best'] = null
  for (const d of dates) if (!best || submissions[d].accuracy > best.accuracy) best = { date: d, accuracy: submissions[d].accuracy }
  const avg = dates.length ? dates.reduce((s, d) => s + submissions[d].accuracy, 0) / dates.length : null
  return {
    completed: dates.length,
    currentStreak: current,
    longestStreak: longest,
    averageAccuracy: avg === null ? null : Math.round(avg * 10) / 10,
    best,
  }
}
