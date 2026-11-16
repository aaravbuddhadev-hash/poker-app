/**
 * The daily probability puzzle. A puzzle is a pure function of its UTC date,
 * so every player gets the same one, and refreshing never changes it.
 */
import { isIsoDate, toIso, type IsoDate } from '../lib/dates'
import { hashString, mulberry32 } from '../lib/random'
import { fullDeck, rankOf, shuffled, suitOf, type Card } from '../poker/cards'
import { calculateEquity } from '../poker/equity'

export type PuzzleKind = 'preflop' | 'flop' | 'turn'

export interface Puzzle {
  date: IsoDate
  /** Puzzle #1 was on FIRST_PUZZLE_DATE. */
  number: number
  kind: PuzzleKind
  hands: Card[][]
  board: Card[]
}

export const FIRST_PUZZLE_DATE = '2026-11-15'

/** Five-day rotation of situations. */
const ROTATION: { kind: PuzzleKind; players: number }[] = [
  { kind: 'preflop', players: 2 },
  { kind: 'flop', players: 2 },
  { kind: 'turn', players: 2 },
  { kind: 'flop', players: 3 },
  { kind: 'preflop', players: 3 },
]

const BOARD_SIZE: Record<PuzzleKind, number> = { preflop: 0, flop: 3, turn: 4 }

/** Today's date at the UTC day boundary, the same moment worldwide. */
export function utcDateKey(now: Date = new Date()): IsoDate {
  return toIso(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
}

const DAY = 86_400_000
const utcMs = (d: IsoDate) => {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

export function puzzleNumber(date: IsoDate): number {
  return Math.round((utcMs(date) - utcMs(FIRST_PUZZLE_DATE)) / DAY) + 1
}

/** Milliseconds until the next puzzle (next UTC midnight). */
export function msUntilNextPuzzle(now: Date = new Date()): number {
  return utcMs(utcDateKey(now)) + DAY - now.getTime()
}

/** A hand someone would plausibly play: a pair, a ten or higher, or suited connectors. */
function playable([a, b]: Card[]): boolean {
  const ra = rankOf(a)
  const rb = rankOf(b)
  return ra === rb || Math.max(ra, rb) >= 8 || (Math.abs(ra - rb) === 1 && suitOf(a) === suitOf(b))
}

/**
 * Keep puzzles worth thinking about: no hand is (almost) drawing dead and no
 * hand is a near-lock. Bounds differ by street because later streets are
 * naturally more one-sided.
 */
const BOUNDS: Record<string, { maxLeader: number; minTrailer: number }> = {
  'flop-2': { maxLeader: 0.85, minTrailer: 0.15 },
  'turn-2': { maxLeader: 0.93, minTrailer: 0.07 },
  'flop-3': { maxLeader: 0.75, minTrailer: 0.08 },
}

function interesting(kind: PuzzleKind, hands: Card[][], board: Card[]): boolean {
  if (!hands.every(playable)) return false
  if (kind === 'preflop') {
    // Skip mirror-image matchups like AK vs AK; exact preflop odds are computed later in a worker.
    const sig = (h: Card[]) => h.map(rankOf).sort().join()
    return new Set(hands.map(sig)).size === hands.length
  }
  const b = BOUNDS[`${kind}-${hands.length}`]
  const eq = calculateEquity({ hands, board }).players.map((p) => p.equity)
  return Math.max(...eq) <= b.maxLeader && Math.min(...eq) >= b.minTrailer
}

export function puzzleForDate(date: IsoDate): Puzzle {
  if (!isIsoDate(date)) throw new RangeError(`Invalid date: ${date}`)
  const rng = mulberry32(hashString(`riverline-daily:${date}`))
  const number = puzzleNumber(date)
  const slot = ROTATION[(((number - 1) % ROTATION.length) + ROTATION.length) % ROTATION.length]
  let candidate: Puzzle | null = null
  for (let attempt = 0; attempt < 80; attempt++) {
    const deck = shuffled(fullDeck(), rng)
    const hands = Array.from({ length: slot.players }, (_, p) => [deck[p * 2], deck[p * 2 + 1]].sort((x, y) => y - x))
    const board = deck.slice(slot.players * 2, slot.players * 2 + BOARD_SIZE[slot.kind])
    candidate = { date, number, kind: slot.kind, hands, board }
    if (interesting(slot.kind, hands, board)) break
  }
  return candidate!
}

export const KIND_LABEL: Record<PuzzleKind, string> = {
  preflop: 'Before the flop',
  flop: 'On the flop',
  turn: 'On the turn',
}
