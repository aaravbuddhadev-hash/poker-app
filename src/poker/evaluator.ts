/**
 * Texas Hold'em hand evaluator.
 *
 * evaluate() scores the best 5-card hand that can be made from 1..7 cards as a
 * single integer: higher always wins, equal is an exact tie. Layout:
 *   category << 20 | r1 << 16 | r2 << 12 | r3 << 8 | r4 << 4 | r5
 * where r1..r5 are the ranks (0..12) that decide ties, most important first.
 *
 * It uses bit masks and lookup tables instead of sorting, so it can score the
 * millions of boards an exact odds calculation needs. It is validated against
 * the known count of every 5-card hand category and against a simple
 * reference implementation (see evaluator.test.ts).
 */
import { RANK_NAMES, RANK_PLURALS, rankOf, suitOf, type Card } from './cards'

export const HandCategory = {
  HighCard: 0,
  OnePair: 1,
  TwoPair: 2,
  ThreeOfAKind: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  FourOfAKind: 7,
  StraightFlush: 8,
} as const
export type HandCategory = (typeof HandCategory)[keyof typeof HandCategory]

export const CATEGORY_NAMES = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
] as const

// ---- Lookup tables over 13-bit rank masks ----
const POPCOUNT = new Uint8Array(8192)
/** Highest rank of a straight in the mask (3 for the A-2-3-4-5 "wheel"), or -1. */
const STRAIGHT_HIGH = new Int8Array(8192)
for (let m = 0; m < 8192; m++) {
  POPCOUNT[m] = (m & 1) + POPCOUNT[m >> 1]
  let high = -1
  for (let h = 12; h >= 4; h--) {
    const run = 0b11111 << (h - 4)
    if ((m & run) === run) {
      high = h
      break
    }
  }
  const wheel = (1 << 12) | 0b1111 // A,2,3,4,5
  if (high < 0 && (m & wheel) === wheel) high = 3
  STRAIGHT_HIGH[m] = high
}

// Scratch buffers reused across calls (the evaluator is synchronous).
const counts = new Uint8Array(13)
const suitMasks = new Int32Array(4)

function pack(category: number, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0): number {
  return (category << 20) | (r1 << 16) | (r2 << 12) | (r3 << 8) | (r4 << 4) | r5
}

/** Highest `n` ranks set in `mask`, packed after `prefix` ranks. */
function topRanks(mask: number, n: number, out: number[]): void {
  for (let r = 12; r >= 0 && out.length < n; r--) if (mask & (1 << r)) out.push(r)
}

export function evaluate(cards: ArrayLike<Card>): number {
  const n = cards.length
  let rankMask = 0
  suitMasks[0] = suitMasks[1] = suitMasks[2] = suitMasks[3] = 0
  for (let i = 0; i < n; i++) {
    const c = cards[i]
    const r = c >> 2
    counts[r]++
    suitMasks[c & 3] |= 1 << r
    rankMask |= 1 << r
  }

  let quad = -1
  let trips1 = -1
  let trips2 = -1
  let pair1 = -1
  let pair2 = -1
  for (let r = 12; r >= 0; r--) {
    const k = counts[r]
    if (k === 0) continue
    counts[r] = 0 // reset scratch as we go
    if (k === 4) quad = r
    else if (k === 3) {
      if (trips1 < 0) trips1 = r
      else if (trips2 < 0) trips2 = r
    } else if (k === 2) {
      if (pair1 < 0) pair1 = r
      else if (pair2 < 0) pair2 = r
    }
  }

  let flushMask = 0
  for (let s = 0; s < 4; s++) if (POPCOUNT[suitMasks[s]] >= 5) flushMask = suitMasks[s]

  if (flushMask) {
    const sf = STRAIGHT_HIGH[flushMask]
    if (sf >= 0) return pack(HandCategory.StraightFlush, sf)
  }

  if (quad >= 0) {
    const k: number[] = []
    topRanks(rankMask & ~(1 << quad), 1, k)
    return pack(HandCategory.FourOfAKind, quad, k[0] ?? 0)
  }

  if (trips1 >= 0 && (trips2 >= 0 || pair1 >= 0)) {
    return pack(HandCategory.FullHouse, trips1, Math.max(trips2, pair1))
  }

  if (flushMask) {
    const f: number[] = []
    topRanks(flushMask, 5, f)
    return pack(HandCategory.Flush, f[0], f[1], f[2], f[3], f[4])
  }

  const st = STRAIGHT_HIGH[rankMask]
  if (st >= 0) return pack(HandCategory.Straight, st)

  if (trips1 >= 0) {
    const k: number[] = []
    topRanks(rankMask & ~(1 << trips1), 2, k)
    return pack(HandCategory.ThreeOfAKind, trips1, k[0] ?? 0, k[1] ?? 0)
  }

  if (pair1 >= 0 && pair2 >= 0) {
    const k: number[] = []
    // A third pair's rank stays available as the kicker.
    topRanks(rankMask & ~(1 << pair1) & ~(1 << pair2), 1, k)
    return pack(HandCategory.TwoPair, pair1, pair2, k[0] ?? 0)
  }

  if (pair1 >= 0) {
    const k: number[] = []
    topRanks(rankMask & ~(1 << pair1), 3, k)
    return pack(HandCategory.OnePair, pair1, k[0] ?? 0, k[1] ?? 0, k[2] ?? 0)
  }

  const h: number[] = []
  topRanks(rankMask, 5, h)
  return pack(HandCategory.HighCard, h[0], h[1] ?? 0, h[2] ?? 0, h[3] ?? 0, h[4] ?? 0)
}

export const categoryOf = (score: number): HandCategory => (score >> 20) as HandCategory

/** The five tie-break ranks encoded in a score, most important first. */
export function scoreRanks(score: number): number[] {
  return [(score >> 16) & 15, (score >> 12) & 15, (score >> 8) & 15, (score >> 4) & 15, score & 15]
}

export const isRoyalFlush = (score: number): boolean =>
  categoryOf(score) === HandCategory.StraightFlush && scoreRanks(score)[0] === 12

export interface HandLabel {
  /** e.g. "Two Pair" or "Royal Flush" */
  name: string
  /** e.g. "Kings and Sevens"; empty for a royal flush */
  detail: string
  /** e.g. "Two Pair, Kings and Sevens" */
  full: string
}

export function describe(score: number): HandLabel {
  const cat = categoryOf(score)
  const [a, b] = scoreRanks(score)
  if (isRoyalFlush(score)) return { name: 'Royal Flush', detail: '', full: 'Royal Flush' }
  const name = CATEGORY_NAMES[cat]
  let detail: string
  switch (cat) {
    case HandCategory.HighCard:
    case HandCategory.Flush:
      detail = `${RANK_NAMES[a]}-high`
      break
    case HandCategory.Straight:
    case HandCategory.StraightFlush:
      detail = `${RANK_NAMES[a]}-high`
      break
    case HandCategory.OnePair:
      detail = RANK_PLURALS[a]
      break
    case HandCategory.TwoPair:
      detail = `${RANK_PLURALS[a]} and ${RANK_PLURALS[b]}`
      break
    case HandCategory.ThreeOfAKind:
    case HandCategory.FourOfAKind:
      detail = RANK_PLURALS[a]
      break
    case HandCategory.FullHouse:
      detail = `${RANK_PLURALS[a]} full of ${RANK_PLURALS[b]}`
      break
    default:
      detail = ''
  }
  return { name, detail, full: detail ? `${name}, ${detail}` : name }
}

const ORDINALS = ['highest', 'second', 'third', 'fourth', 'fifth']

/** Plain-English reason why hand A beats (or ties) hand B. */
export function explainComparison(a: number, b: number): string {
  if (a === b) return `Both make exactly the same five-card hand (${describe(a).full}), so the pot is split.`
  const [win, lose] = a > b ? [a, b] : [b, a]
  const W = describe(win)
  const L = describe(lose)
  if (categoryOf(win) !== categoryOf(lose)) return `${W.name} beats ${L.name}.`
  if (W.full !== L.full) return `${W.full} beats ${L.full}.`
  // Same visible hand: decided by a kicker or a lower card.
  const wr = scoreRanks(win)
  const lr = scoreRanks(lose)
  const i = wr.findIndex((r, idx) => r !== lr[idx])
  const cat = categoryOf(win)
  const byCards = cat === HandCategory.Flush || cat === HandCategory.HighCard
  const decider = byCards ? `the ${ORDINALS[i]} card decides` : 'the kicker decides'
  return `Both have ${W.full}; ${decider}: ${RANK_NAMES[wr[i]]} beats ${RANK_NAMES[lr[i]]}.`
}

export interface BestHand {
  score: number
  label: HandLabel
  /** The five cards that make the hand, ordered for display (groups first). */
  cards: Card[]
}

/** Best five-card hand from up to seven cards, with the cards that make it. */
export function bestHand(cards: readonly Card[]): BestHand {
  let bestScore = -1
  let best: Card[] = [...cards]
  if (cards.length <= 5) {
    bestScore = evaluate(cards)
  } else {
    const n = cards.length
    const pick = new Array<Card>(5)
    // All 5-card combinations (21 for seven cards).
    for (let a = 0; a < n - 4; a++)
      for (let b = a + 1; b < n - 3; b++)
        for (let c = b + 1; c < n - 2; c++)
          for (let d = c + 1; d < n - 1; d++)
            for (let e = d + 1; e < n; e++) {
              pick[0] = cards[a]
              pick[1] = cards[b]
              pick[2] = cards[c]
              pick[3] = cards[d]
              pick[4] = cards[e]
              const s = evaluate(pick)
              if (s > bestScore) {
                bestScore = s
                best = [...pick]
              }
            }
  }
  return { score: bestScore, label: describe(bestScore), cards: orderForDisplay(best, bestScore) }
}

/** Groups first (e.g. K K K 7 7), then by rank; the wheel shows 5-4-3-2-A. */
function orderForDisplay(cards: Card[], score: number): Card[] {
  const freq = new Map<number, number>()
  for (const c of cards) freq.set(rankOf(c), (freq.get(rankOf(c)) ?? 0) + 1)
  const cat = categoryOf(score)
  const wheel = (cat === HandCategory.Straight || cat === HandCategory.StraightFlush) && scoreRanks(score)[0] === 3
  const key = (c: Card) => (wheel && rankOf(c) === 12 ? -1 : rankOf(c))
  return [...cards].sort((x, y) => freq.get(rankOf(y))! - freq.get(rankOf(x))! || key(y) - key(x) || suitOf(y) - suitOf(x))
}
