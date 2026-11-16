/**
 * Exact beginner probabilities, computed from combinatorics rather than typed
 * in, so every number shown in a lesson can be checked by a test.
 */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

/** Cards you can't see after the flop: 52 - your 2 - the 3 on the board. */
export const UNSEEN_ON_FLOP = 47
/** Cards you can't see after the turn. */
export const UNSEEN_ON_TURN = 46

/**
 * Chance that at least one of `outs` good cards comes when `draws` more cards
 * are dealt from `unseen` unknown cards: 1 - (ways to miss every time) / (all ways).
 */
export function hitChance(outs: number, unseen: number, draws: number): number {
  return 1 - choose(unseen - outs, draws) / choose(unseen, draws)
}

/** The table shortcut: outs x 4 with two cards to come, outs x 2 with one. */
export function ruleOfTwoAndFour(outs: number, draws: 1 | 2): number {
  return Math.min(1, (outs * (draws === 2 ? 4 : 2)) / 100)
}

const STARTING_HANDS = choose(52, 2) // 1,326

export const startingHandOdds = {
  /** Any pocket pair: 13 ranks x 6 suit combinations. */
  anyPocketPair: (13 * choose(4, 2)) / STARTING_HANDS,
  /** One specific pair, e.g. two aces. */
  specificPocketPair: choose(4, 2) / STARTING_HANDS,
  /** Two cards of the same suit. */
  suited: (4 * choose(13, 2)) / STARTING_HANDS,
  /** With a pocket pair, at least one more of that rank on the flop (a set or better). */
  setOnFlop: 1 - choose(48, 3) / choose(50, 3),
}

export const COMMON_DRAWS = [
  { name: 'Flush draw', outs: 9, how: 'Four cards of one suit; any of the other 9 of that suit completes it.' },
  { name: 'Open-ended straight draw', outs: 8, how: 'Four in a row like 6-7-8-9; a 5 or a 10 completes it (4 of each).' },
  { name: 'Two overcards', outs: 6, how: 'Both hole cards are higher than the board; pairing either one (3 + 3 cards).' },
  { name: 'Gutshot straight draw', outs: 4, how: 'One rank missing in the middle, like 6-7-_-9-10; only the four 8s.' },
] as const

/** "1 in N" phrasing for a probability. */
export function oneIn(p: number): string {
  const n = 1 / p
  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-US')
}

export function percent(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`
}
