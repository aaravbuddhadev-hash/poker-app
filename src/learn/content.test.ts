import { describe, expect, it } from 'vitest'
import { fullDeck, parseCard, parseCards, type Card } from '../poker/cards'
import { bestHand, evaluate, explainComparison } from '../poker/evaluator'
import { GLOSSARY, searchGlossary } from './glossary'
import { LESSON_EXAMPLES, LESSONS } from './lessons'
import lessonsSource from './lessons.tsx?raw'

describe('lessons', () => {
  it('have unique ids and the full rules curriculum', () => {
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(['goal', 'cards', 'blinds', 'rounds', 'actions', 'showdown', 'ties', 'odds', 'terms'])
  })

  it('growing hand example says what the lesson claims', () => {
    const { hole, board, expect: e } = LESSON_EXAMPLES.growingHand
    const b = parseCards(board)
    expect(bestHand([...parseCards(hole), ...b.slice(0, 3)]).label.full).toBe(e.flop)
    expect(bestHand([...parseCards(hole), ...b]).label.full).toBe(e.river)
  })

  it('drawing hand example: Ten-high on the flop with exactly 15 outs, straight on the turn', () => {
    const { hole, board, expect: e } = LESSON_EXAMPLES.drawingHand
    const h = parseCards(hole)
    const b = parseCards(board)
    const flop = [...h, ...b.slice(0, 3)]
    expect(bestHand(flop).label.full).toBe(e.flop)
    expect(bestHand([...flop, b[3]]).label.full).toBe(e.turn)
    // Count turn cards that make a straight or better.
    const seen = new Set(flop)
    const outs = fullDeck().filter((c: Card) => !seen.has(c) && evaluate([...flop, c]) >= evaluate(parseCards('6c 5d 4h 3s 2c')))
    expect(outs.length).toBe(e.flopOuts)
  })

  it.each(['showdown', 'kicker', 'boardPlays'] as const)('%s example has the stated winner and reason', (key) => {
    const ex = LESSON_EXAMPLES[key]
    const board = parseCards(ex.board)
    const scores = ex.players.map((p) => evaluate([...parseCards(p.hole), ...board]))
    const top = Math.max(...scores)
    expect(scores.flatMap((s, i) => (s === top ? [i] : []))).toEqual(ex.expect.winners)
    if ('reason' in ex.expect) {
      const runnerUp = Math.max(...scores.filter((s) => s !== top))
      expect(explainComparison(top, runnerUp)).toBe(ex.expect.reason)
    }
  })
})

describe('glossary', () => {
  it('has unique ids and terms, and every related link points to a real entry', () => {
    const ids = new Set(GLOSSARY.map((g) => g.id))
    expect(ids.size).toBe(GLOSSARY.length)
    expect(new Set(GLOSSARY.map((g) => g.term.toLowerCase())).size).toBe(GLOSSARY.length)
    for (const g of GLOSSARY) for (const r of g.related) expect(ids.has(r), `${g.id} -> ${r}`).toBe(true)
  })

  it('every glossary link in the lessons exists', () => {
    const ids = new Set(GLOSSARY.map((g) => g.id))
    const linked = [...lessonsSource.matchAll(/<Term id="([^"]+)"/g)].map((m) => m[1])
    expect(linked.length).toBeGreaterThan(20)
    for (const id of linked) expect(ids.has(id), id).toBe(true)
  })

  it('the "nuts" example is really the best possible hand on that board', () => {
    const board = parseCards('Ks Qs 7s 2d 3c')
    const nuts = evaluate([parseCard('As'), parseCard('Js'), ...board])
    const deck = fullDeck().filter((c) => !board.includes(c))
    let best = -1
    for (let i = 0; i < deck.length; i++)
      for (let j = i + 1; j < deck.length; j++) best = Math.max(best, evaluate([deck[i], deck[j], ...board]))
    expect(nuts).toBe(best)
  })

  it('searches terms, aliases and definitions, best matches first', () => {
    expect(searchGlossary('kick')[0].id).toBe('kicker')
    expect(searchGlossary('UTG')[0].id).toBe('under-the-gun')
    expect(searchGlossary('oesd')[0].id).toBe('open-ended')
    expect(searchGlossary('community').map((g) => g.id)).toContain('board')
    expect(searchGlossary('zzz')).toEqual([])
    expect(searchGlossary('  ')).toHaveLength(GLOSSARY.length)
  })
})
