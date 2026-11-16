/**
 * Questions generated from random deals. Every answer and explanation comes
 * from the hand evaluator or the exact equity engine, so they are always right.
 */
import { cardToString, fullDeck, makeCard, rankLabel, remainingDeck, shuffled, SUIT_SYMBOLS, suitOf, type Card } from '../poker/cards'
import { calculateEquity } from '../poker/equity'
import { bestHand, categoryOf, CATEGORY_NAMES, describe, evaluate, explainComparison, HandCategory } from '../poker/evaluator'
import type { CardsQuestion, ChoiceQuestion, Difficulty, NumberQuestion, Question, TableQuestion } from './types'

type Rng = () => number
const pick = <T,>(arr: readonly T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)]
const cardText = (c: Card) => `${rankLabel(c)}${SUIT_SYMBOLS[suitOf(c)]}`
const ids = (cards: Card[]) => cards.map(cardToString).join('')

// ---------------------------------------------------------------------------
// Making a five-card hand of a given category
// ---------------------------------------------------------------------------

/** Five cards that evaluate to `cat`, ordered for display. Built directly for rare hands. */
export function handOfCategory(cat: HandCategory, rng: Rng): Card[] {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const suits = shuffled([0, 1, 2, 3], rng)
    const ranks = shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rng)
    let cards: Card[]
    switch (cat) {
      case HandCategory.StraightFlush: {
        const high = 3 + Math.floor(rng() * 9) // 3..11: wheel up to King-high, never royal
        // Ranks high, high-1, ... high-4; below 2 wraps to the ace (only for the wheel).
        cards = [0, 1, 2, 3, 4].map((k) => makeCard(high - k < 0 ? 12 : high - k, suits[0]))
        break
      }
      case HandCategory.FourOfAKind:
        cards = [0, 1, 2, 3].map((s) => makeCard(ranks[0], s)).concat(makeCard(ranks[1], suits[0]))
        break
      case HandCategory.FullHouse:
        cards = suits.slice(0, 3).map((s) => makeCard(ranks[0], s)).concat(suits.slice(0, 2).map((s) => makeCard(ranks[1], s)))
        break
      case HandCategory.Flush:
        cards = ranks.slice(0, 5).map((r) => makeCard(r, suits[0]))
        break
      case HandCategory.Straight: {
        const high = 3 + Math.floor(rng() * 10) // 3 (wheel) .. 12 (Broadway)
        cards = [0, 1, 2, 3, 4].map((k) => makeCard(high - k < 0 ? 12 : high - k, Math.floor(rng() * 4)))
        break
      }
      default:
        cards = shuffled(fullDeck(), rng).slice(0, 5)
    }
    if (new Set(cards).size === 5 && categoryOf(evaluate(cards)) === cat) return bestHand(cards).cards
  }
  throw new Error(`Could not build a ${CATEGORY_NAMES[cat]}`)
}

// ---------------------------------------------------------------------------
// Hand rankings
// ---------------------------------------------------------------------------

export function rankingsQuestion(difficulty: Difficulty, rng: Rng): Question {
  if (difficulty === 'beginner' && rng() < 0.4) {
    // Name this hand.
    const cat = Math.floor(rng() * 9) as HandCategory
    const cards = handOfCategory(cat, rng)
    const right = CATEGORY_NAMES[cat]
    const wrong = shuffled(CATEGORY_NAMES.filter((n) => n !== right), rng).slice(0, 3)
    const answer = Math.floor(rng() * 4)
    const choices = [...wrong]
    choices.splice(answer, 0, right)
    return {
      id: `rankings:name:${ids(cards)}`,
      category: 'rankings',
      difficulty,
      type: 'choice',
      prompt: 'What is this hand called?',
      cards,
      choices,
      answer,
      explanation: `${describe(evaluate(cards)).full}.`,
      highlight: cards,
    } satisfies ChoiceQuestion
  }

  let cats: HandCategory[]
  if (difficulty === 'beginner') {
    // Three categories spread well apart.
    do cats = shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8] as HandCategory[], rng).slice(0, 3)
    while ([...cats].sort((a, b) => a - b).some((c, i, a) => i > 0 && c - a[i - 1] < 2))
  } else if (difficulty === 'intermediate') {
    // Four neighbouring categories, e.g. Three of a Kind to Full House.
    const start = Math.floor(rng() * 6)
    cats = shuffled([start, start + 1, start + 2, start + 3] as HandCategory[], rng)
  } else {
    // Three hands of the same category: ranks and kickers decide.
    const cat = (1 + Math.floor(rng() * 7)) as HandCategory
    cats = [cat, cat, cat]
  }
  // Options must have different strengths; prefer options that don't share any card.
  let options: Card[][] = []
  let scores: number[] = []
  for (let attempt = 0; attempt < 400; attempt++) {
    const o = cats.map((c) => handOfCategory(c, rng))
    const s = o.map(evaluate)
    if (new Set(s).size !== s.length) continue
    options = o
    scores = s
    if (new Set(o.flat()).size === o.flat().length) break
  }
  if (!options.length) throw new Error('No distinct options found')
  const best = scores.indexOf(Math.max(...scores))
  const order = scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .map(({ s, i }) => `${String.fromCharCode(65 + i)}: ${describe(s).full}`)
  const same = difficulty === 'advanced'
  return {
    id: `rankings:best:${options.map(ids).join('|')}`,
    category: 'rankings',
    difficulty,
    type: 'cards',
    prompt: same ? `All three are ${CATEGORY_NAMES[categoryOf(scores[0])]}. Which is strongest?` : 'Which hand is strongest?',
    options,
    answer: best,
    explanation: `Strongest to weakest: ${order.join(' · ')}.${same ? ` ${explainComparison(scores[best], Math.max(...scores.filter((s) => s !== scores[best])))}` : ''}`,
    highlight: options[best],
  } satisfies CardsQuestion
}

// ---------------------------------------------------------------------------
// Dealing showdowns
// ---------------------------------------------------------------------------

interface Deal {
  hands: Card[][]
  board: Card[]
  scores: number[]
  top: number
  winners: number[]
}

function deal(players: number, boardSize: number, rng: Rng): Deal {
  const d = shuffled(fullDeck(), rng)
  const hands = Array.from({ length: players }, (_, p) => [d[p * 2], d[p * 2 + 1]].sort((a, b) => b - a))
  const board = d.slice(players * 2, players * 2 + boardSize)
  const scores = hands.map((h) => evaluate([...h, ...board]))
  const top = Math.max(...scores)
  return { hands, board, scores, top, winners: scores.flatMap((s, i) => (s === top ? [i] : [])) }
}

function tableQuestion(category: 'who-wins' | 'ties', difficulty: Difficulty, d: Deal, prompt: string): TableQuestion {
  const choices = [...d.hands.map((_, i) => `Player ${i + 1}`), 'Split pot']
  const split = d.winners.length > 1
  const answer = split ? choices.length - 1 : d.winners[0]
  const labels = d.hands.map((h, i) => `Player ${i + 1}: ${bestHand([...h, ...d.board]).label.full}`)
  const runnerUp = Math.max(...d.scores.filter((s) => s !== d.top), -1)
  const why = split ? explainComparison(d.top, d.top) : explainComparison(d.top, runnerUp)
  return {
    id: `${category}:${ids(d.hands.flat())}:${ids(d.board)}`,
    category,
    difficulty,
    type: 'table',
    prompt,
    hands: d.hands,
    board: d.board,
    choices,
    answer,
    explanation: `${labels.join('. ')}. ${why}`,
    highlight: d.winners.flatMap((w) => bestHand([...d.hands[w], ...d.board]).cards),
  }
}

export function whoWinsQuestion(difficulty: Difficulty, rng: Rng): Question {
  if (difficulty === 'intermediate' && rng() < 0.35) return riverCardQuestion(difficulty, rng)
  for (let i = 0; i < 5000; i++) {
    if (difficulty === 'advanced') {
      const d = deal(3, 5, rng)
      return tableQuestion('who-wins', difficulty, d, 'Three players reach showdown. Who wins?')
    }
    const d = deal(2, 5, rng)
    if (d.winners.length > 1) continue
    const gap = Math.abs(categoryOf(d.scores[0]) - categoryOf(d.scores[1]))
    if (difficulty === 'beginner' ? gap >= 2 : gap <= 1) return tableQuestion('who-wins', difficulty, d, 'Who wins this showdown?')
  }
  throw new Error('No deal found')
}

/** Card selection: which river card makes the trailing player win? */
function riverCardQuestion(difficulty: Difficulty, rng: Rng): CardsQuestion {
  for (let i = 0; i < 5000; i++) {
    const d = deal(2, 4, rng)
    if (d.winners.length > 1) continue
    const trailer = 1 - d.winners[0]
    const rivers = remainingDeck([...d.hands.flat(), ...d.board])
    const winsFor = (c: Card) => {
      const s = d.hands.map((h) => evaluate([...h, ...d.board, c]))
      return s[trailer] > s[1 - trailer]
    }
    const outs = rivers.filter(winsFor)
    const blanks = rivers.filter((c) => !winsFor(c))
    if (outs.length < 1 || outs.length > 10) continue
    const right = pick(outs, rng)
    const wrong = shuffled(blanks, rng).slice(0, 3)
    const answer = Math.floor(rng() * 4)
    const options = [...wrong]
    options.splice(answer, 0, right)
    const after = d.hands.map((h) => bestHand([...h, ...d.board, right]).label.full)
    return {
      id: `who-wins:river:${ids(d.hands.flat())}:${ids(d.board)}:${ids(options)}`,
      category: 'who-wins',
      difficulty,
      type: 'cards',
      prompt: `Player ${d.winners[0] + 1} is ahead on the turn. Which river card makes Player ${trailer + 1} the winner?`,
      hands: d.hands,
      board: d.board,
      options: options.map((c) => [c]),
      answer,
      explanation: `With the ${cardText(right)}, Player ${trailer + 1} has ${after[trailer]} against ${after[1 - trailer]}. Player ${trailer + 1} wins on ${outs.length} of the ${rivers.length} river cards: ${outs.map(cardText).join(' ')}.`,
      highlight: [right],
    }
  }
  throw new Error('No deal found')
}

// ---------------------------------------------------------------------------
// Tie-breakers
// ---------------------------------------------------------------------------

export function tiesQuestion(difficulty: Difficulty, rng: Rng): Question {
  const wantSplit = difficulty === 'advanced' && rng() < 0.5
  for (let i = 0; i < 20000; i++) {
    const d = deal(2, 5, rng)
    const [a, b] = d.scores
    const sameCat = categoryOf(a) === categoryOf(b)
    if (!sameCat) continue
    if (wantSplit) {
      if (d.winners.length === 2) return tableQuestion('ties', difficulty, d, 'Both players have the same kind of hand. Who wins?')
      continue
    }
    if (d.winners.length > 1) continue
    const sameLabel = describe(a).full === describe(b).full
    const cat = categoryOf(a)
    if (difficulty === 'beginner' && sameLabel && (cat === HandCategory.OnePair || cat === HandCategory.HighCard))
      return tableQuestion('ties', difficulty, d, 'Same hand on the surface. Who wins?')
    if (difficulty === 'intermediate' && cat >= HandCategory.TwoPair && cat <= HandCategory.Flush)
      return tableQuestion('ties', difficulty, d, 'Both players have the same kind of hand. Who wins?')
    if (difficulty === 'advanced' && sameLabel) return tableQuestion('ties', difficulty, d, 'Both players have the same kind of hand. Who wins?')
  }
  throw new Error('No deal found')
}

// ---------------------------------------------------------------------------
// Advanced probability (exact, from the engine)
// ---------------------------------------------------------------------------

export function probabilityDealQuestion(rng: Rng): NumberQuestion {
  if (rng() < 0.5) {
    // Count the river outs.
    for (let i = 0; i < 5000; i++) {
      const d = deal(2, 4, rng)
      if (d.winners.length > 1) continue
      const trailer = 1 - d.winners[0]
      const outs = remainingDeck([...d.hands.flat(), ...d.board]).filter((c) => {
        const s = d.hands.map((h) => evaluate([...h, ...d.board, c]))
        return s[trailer] > s[1 - trailer]
      })
      if (outs.length < 2 || outs.length > 14) continue
      return {
        id: `probability:outs:${ids(d.hands.flat())}:${ids(d.board)}`,
        category: 'probability',
        difficulty: 'advanced',
        type: 'number',
        prompt: `Player ${trailer + 1} is behind on the turn. How many of the 44 possible river cards make Player ${trailer + 1} win outright?`,
        hands: d.hands,
        board: d.board,
        unit: 'cards',
        min: 0,
        max: 44,
        answer: outs.length,
        tolerance: 0,
        explanation: `Player ${trailer + 1} wins with: ${outs.map(cardText).join(' ')} (${outs.length} cards, ${((outs.length / 44) * 100).toFixed(1)}%).`,
        highlight: outs,
      }
    }
  }
  // Estimate flop equity within 8 points.
  for (let i = 0; i < 5000; i++) {
    const d = deal(2, 3, rng)
    const r = calculateEquity({ hands: d.hands, board: d.board })
    const eq = r.players[0].equity
    if (eq < 0.2 || eq > 0.8) continue
    return {
      id: `probability:equity:${ids(d.hands.flat())}:${ids(d.board)}`,
      category: 'probability',
      difficulty: 'advanced',
      type: 'number',
      prompt: 'On this flop, what share of the pot does Player 1 win on average?',
      hands: d.hands,
      board: d.board,
      unit: '%',
      min: 0,
      max: 100,
      answer: Math.round(eq * 1000) / 10,
      tolerance: 8,
      explanation: `Exactly ${(eq * 100).toFixed(1)}%: Player 1 wins ${(r.players[0].win * 100).toFixed(1)}% outright and splits ${(r.players[0].tie * 100).toFixed(1)}%, checked across all ${r.total} turn-and-river combinations.`,
    }
  }
  throw new Error('No deal found')
}
