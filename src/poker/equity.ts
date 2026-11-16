/**
 * Exact all-in equity: every possible way the remaining community cards can
 * come is dealt out and scored. Nothing is sampled or estimated, so results
 * are exact (e.g. heads-up preflop checks all 1,712,304 boards).
 */
import { assertValidUnique, CardError, remainingDeck, type Card } from './cards'
import { evaluate } from './evaluator'

export interface EquityInput {
  /** Each player's two hole cards. */
  hands: Card[][]
  /** 0 to 5 community cards already dealt. */
  board: Card[]
}

export interface PlayerEquity {
  /** Share of boards this player wins outright, 0..1. */
  win: number
  /** Share of boards this player splits with others, 0..1. */
  tie: number
  /** Expected share of the pot, 0..1 (wins + fractional splits). */
  equity: number
  winCount: number
  tieCount: number
}

export interface EquityResult {
  players: PlayerEquity[]
  /** Number of boards checked. */
  total: number
  /** Share of boards where the pot is split between two or more players. */
  splitRate: number
  /** Always true: every board is enumerated. */
  exact: true
}

export const MAX_PLAYERS = 10

export function validateEquityInput({ hands, board }: EquityInput): void {
  if (hands.length < 2) throw new CardError('Choose cards for at least two players.')
  if (hands.length > MAX_PLAYERS) throw new CardError(`At most ${MAX_PLAYERS} players.`)
  for (const h of hands) if (h.length !== 2) throw new CardError('Each player needs exactly two cards.')
  if (board.length > 5) throw new CardError('The board has at most five cards.')
  assertValidUnique([...hands.flat(), ...board])
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

/** How many boards an exact calculation will check. */
export function boardCount({ hands, board }: EquityInput): number {
  return choose(52 - hands.length * 2 - board.length, 5 - board.length)
}

export function calculateEquity(input: EquityInput, onProgress?: (done: number, total: number) => void): EquityResult {
  validateEquityInput(input)
  const { hands, board } = input
  const players = hands.length
  const deck = remainingDeck([...hands.flat(), ...board])
  const need = 5 - board.length
  const total = choose(deck.length, need)

  // One 7-card buffer per player: 2 hole cards then the 5-card board.
  const sevens = hands.map((h) => {
    const a = new Int32Array(7)
    a[0] = h[0]
    a[1] = h[1]
    for (let i = 0; i < board.length; i++) a[2 + i] = board[i]
    return a
  })
  const winCount = new Float64Array(players)
  const tieCount = new Float64Array(players)
  const share = new Float64Array(players)
  const scores = new Int32Array(players)
  let splits = 0
  let done = 0

  const idx = Array.from({ length: need }, (_, i) => i)
  const nDeck = deck.length
  const progressEvery = 100_000

  const scoreBoard = () => {
    let best = -1
    let winners = 0
    for (let p = 0; p < players; p++) {
      const s = evaluate(sevens[p])
      scores[p] = s
      if (s > best) {
        best = s
        winners = 1
      } else if (s === best) winners++
    }
    if (winners === 1) {
      for (let p = 0; p < players; p++) if (scores[p] === best) winCount[p]++
    } else {
      splits++
      for (let p = 0; p < players; p++)
        if (scores[p] === best) {
          tieCount[p]++
          share[p] += 1 / winners
        }
    }
    done++
    if (onProgress && done % progressEvery === 0) onProgress(done, total)
  }

  if (need === 0) scoreBoard()
  else {
    // Odometer over all `need`-card combinations of the remaining deck.
    for (;;) {
      for (let j = 0; j < need; j++) {
        const c = deck[idx[j]]
        for (let p = 0; p < players; p++) sevens[p][2 + board.length + j] = c
      }
      scoreBoard()
      let j = need - 1
      while (j >= 0 && idx[j] === nDeck - need + j) j--
      if (j < 0) break
      idx[j]++
      for (let k = j + 1; k < need; k++) idx[k] = idx[k - 1] + 1
    }
  }

  onProgress?.(done, total)
  return {
    players: Array.from({ length: players }, (_, p) => ({
      win: winCount[p] / done,
      tie: tieCount[p] / done,
      equity: (winCount[p] + share[p]) / done,
      winCount: winCount[p],
      tieCount: tieCount[p],
    })),
    total: done,
    splitRate: splits / done,
    exact: true,
  }
}
