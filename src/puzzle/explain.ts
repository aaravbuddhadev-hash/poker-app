/**
 * Short explanations for a puzzle's answer. Every number here comes from the
 * exact equity result or from scoring real cards; nothing is estimated.
 */
import { RANK_NAMES, rankLabel, rankOf, remainingDeck, SUIT_SYMBOLS, suitOf, type Card } from '../poker/cards'
import type { EquityResult } from '../poker/equity'
import { bestHand, evaluate } from '../poker/evaluator'
import type { Puzzle } from './daily'

export const cardText = (c: Card) => `${rankLabel(c)}${SUIT_SYMBOLS[suitOf(c)]}`
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const name = (i: number) => `Player ${i + 1}`

function preflopMatchup(p: Puzzle, r: EquityResult): string | null {
  if (p.hands.length !== 2) return null
  const [h1, h2] = p.hands.map((h) => h.map(rankOf).sort((a, b) => b - a))
  const pair1 = h1[0] === h1[1]
  const pair2 = h2[0] === h2[1]
  if (pair1 && pair2) {
    const lo = h1[0] < h2[0] ? 0 : 1
    return `Pair against pair: ${name(lo)}’s lower pair mostly needs one of the two remaining ${RANK_NAMES[p.hands[lo].map(rankOf)[0]]}s to win (${pct(r.players[lo].equity)}).`
  }
  if (pair1 !== pair2) {
    const pi = pair1 ? 0 : 1
    const pairRank = (pair1 ? h1 : h2)[0]
    const other = pair1 ? h2 : h1
    const over = other.filter((x) => x > pairRank).length
    if (over === 2) return `A pair against two higher cards is the classic “race”: here the pair has ${pct(r.players[pi].equity)}.`
    if (over === 1) return `${name(pi)}’s pair is ahead; ${name(1 - pi)} mostly needs to pair the one card that’s higher than it.`
    return `${name(pi)}’s pair is ahead of two lower cards; ${name(1 - pi)} needs to improve to win.`
  }
  const shared = h1.find((x) => h2.includes(x))
  if (shared !== undefined) {
    return `Both hands contain a ${RANK_NAMES[shared]}, so the other card often decides: here ${name(r.players[0].equity > r.players[1].equity ? 0 : 1)} has ${pct(Math.max(r.players[0].equity, r.players[1].equity))}.`
  }
  return 'Neither hand is paired, so either player can win by pairing up or by making a straight or flush.'
}

/** River cards (turn puzzles) grouped by who they make the winner. */
export function riverOutcomes(p: Puzzle): { winners: number[]; cards: Card[] }[] {
  if (p.board.length !== 4) return []
  const groups = new Map<string, Card[]>()
  for (const c of remainingDeck([...p.hands.flat(), ...p.board])) {
    const scores = p.hands.map((h) => evaluate([...h, ...p.board, c]))
    const top = Math.max(...scores)
    const key = scores.flatMap((s, i) => (s === top ? [i] : [])).join(',')
    groups.set(key, [...(groups.get(key) ?? []), c])
  }
  return [...groups.entries()].map(([k, cards]) => ({ winners: k.split(',').map(Number), cards }))
}

export function explainPuzzle(p: Puzzle, r: EquityResult): string[] {
  const out: string[] = []
  const eq = r.players.map((x) => x.equity)
  const top = Math.max(...eq)
  const leader = eq.indexOf(top)
  if (eq.every((e) => Math.abs(e - top) < 0.0005)) out.push('The hands are exactly even.')
  else out.push(`${name(leader)} is the favorite with ${pct(top)} of the pot on average.`)

  if (p.board.length) {
    const hands = p.hands.map((h, i) => `${name(i)} has ${bestHand([...h, ...p.board]).label.full}`)
    out.push(`Right now ${hands.join('; ')}.`)
  }

  if (p.kind === 'preflop') {
    const m = preflopMatchup(p, r)
    if (m) out.push(m)
    p.hands.forEach((h, i) => {
      if (suitOf(h[0]) === suitOf(h[1])) out.push(`${name(i)} is suited, which adds some flush chances.`)
    })
  }

  if (p.kind === 'turn') {
    const outcomes = riverOutcomes(p)
    for (const g of outcomes.sort((a, b) => a.cards.length - b.cards.length)) {
      if (g.winners.length === 1 && g.winners[0] === leader) continue
      const who = g.winners.length > 1 ? `The pot is split on ${g.cards.length}` : `${name(g.winners[0])} wins on ${g.cards.length}`
      out.push(`${who} of the ${r.total} possible river cards: ${g.cards.map(cardText).join(' ')}.`)
    }
  }

  if (p.kind === 'flop') {
    p.hands.forEach((_, i) => {
      if (i !== leader) out.push(`${name(i)} wins outright on ${r.players[i].winCount.toLocaleString('en-US')} of the ${r.total.toLocaleString('en-US')} possible turn-and-river combinations.`)
    })
  }

  if (r.splitRate > 0 && p.kind !== 'turn') out.push(`The pot is split ${pct(r.splitRate)} of the time.`)
  out.push(`Exact answer: all ${r.total.toLocaleString('en-US')} ways the board can finish were checked.`)
  return out
}
