import { describe as group, expect, it } from 'vitest'
import { mulberry32 } from '../data/demoData'
import { parseCard, parseCards, shuffled, fullDeck, cardToString, CardError, assertValidUnique, type Card } from './cards'
import { bestHand, categoryOf, describe, evaluate, explainComparison, HandCategory, isRoyalFlush } from './evaluator'
import { FIVE_CARD_HANDS, HAND_RANKINGS } from './handRankings'

const ev = (s: string) => evaluate(parseCards(s))

group('cards', () => {
  it('parses and prints cards', () => {
    expect(cardToString(parseCard('As'))).toBe('As')
    expect(cardToString(parseCard('10h'))).toBe('Th')
    expect(cardToString(parseCard('td'))).toBe('Td')
    expect(() => parseCard('1s')).toThrow(CardError)
    expect(() => parseCard('Ax')).toThrow(CardError)
  })
  it('prevents duplicate cards', () => {
    expect(() => assertValidUnique(parseCards('As Kd As'))).toThrow(/As is used more than once/)
    expect(() => assertValidUnique([52])).toThrow(CardError)
    expect(() => assertValidUnique(parseCards('As Kd'))).not.toThrow()
  })
})

group('categories', () => {
  it.each([
    ['As Ks Qs Js Ts', HandCategory.StraightFlush],
    ['5d 4d 3d 2d Ad', HandCategory.StraightFlush],
    ['Qc Qd Qh Qs 7d', HandCategory.FourOfAKind],
    ['Kc Kd Ks 7h 7c', HandCategory.FullHouse],
    ['Ad Jd 9d 6d 3d', HandCategory.Flush],
    ['Tc 9d 8h 7s 6c', HandCategory.Straight],
    ['5c 4d 3h 2s Ac', HandCategory.Straight],
    ['8c 8h 8s Kd 3c', HandCategory.ThreeOfAKind],
    ['Jh Jc 4s 4d Ah', HandCategory.TwoPair],
    ['Ts Th Ad 8c 4s', HandCategory.OnePair],
    ['Ac Qd 9h 6s 3c', HandCategory.HighCard],
  ])('%s', (hand, cat) => expect(categoryOf(ev(hand))).toBe(cat))

  it('does not wrap straights around the ace', () => {
    expect(categoryOf(ev('Qc Kd Ah 2s 3c'))).toBe(HandCategory.HighCard)
  })

  it('recognizes a royal flush', () => {
    expect(isRoyalFlush(ev('As Ks Qs Js Ts'))).toBe(true)
    expect(isRoyalFlush(ev('Ks Qs Js Ts 9s'))).toBe(false)
  })
})

group('ordering and tie-breaks', () => {
  const beats = (a: string, b: string) => expect(ev(a)).toBeGreaterThan(ev(b))
  const ties = (a: string, b: string) => expect(ev(a)).toBe(ev(b))

  it('ranks the categories in order', () => {
    const order = HAND_RANKINGS.map((h) => ev(h.example))
    for (let i = 1; i < order.length; i++) expect(order[i - 1]).toBeGreaterThan(order[i])
  })
  it('wheel is the lowest straight', () => beats('6c 5d 4h 3s 2c', '5c 4d 3h 2s Ac'))
  it('Broadway beats King-high straight', () => beats('Ac Kd Qh Js Tc', 'Kc Qd Jh Ts 9c'))
  it('pair kickers decide', () => {
    beats('Ac Ad Kh 5s 2c', 'As Ah Qh Js Tc')
    beats('Ac Ad Kh 5s 3c', 'As Ah Kd 5c 2d')
  })
  it('two pair: top pair, then second pair, then kicker', () => {
    beats('Kc Kd 2h 2s 3c', 'Qc Qd Jh Js Ac')
    beats('Kc Kd 5h 5s 2c', 'Ks Kh 4h 4s Ac')
    beats('Kc Kd 5h 5s Qc', 'Ks Kh 5d 5c Jc')
  })
  it('full house compares trips before the pair', () => {
    beats('3c 3d 3h 2s 2c', '2h 2d 2c As Ac')
    beats('Kc Kd Kh 9s 9c', 'Ks Kh Kd 7s 7c')
  })
  it('flush compares every card', () => {
    beats('Ah Kh 9h 5h 3h', 'Ad Kd 9d 5d 2d')
    ties('Ah Kh 9h 5h 3h', 'Ad Kd 9d 5d 3d') // suits never break ties
  })
  it('uses the best five of seven cards', () => {
    // Three pairs: best two pairs + best remaining card as kicker.
    expect(describe(ev('Ac Ad Kc Kd Qc Qd 2s')).full).toBe('Two Pair, Aces and Kings')
    expect(ev('Ac Ad Kc Kd Qc Qd 2s')).toBe(ev('Ah As Kh Ks Qh'))
    // Two sets make a full house using the higher set.
    expect(describe(ev('9c 9d 9h 4s 4c 4d Ks')).full).toBe('Full House, Nines full of Fours')
    // Seven-card flush with a straight flush hidden inside.
    expect(categoryOf(ev('2h 3h 4h 5h 6h 9h Kh'))).toBe(HandCategory.StraightFlush)
  })
  it('board can play for both players (split)', () => {
    const board = 'Ac Kd Qh Js Tc'
    ties(`${board} 2c 3d`, `${board} 4h 5s`)
  })
})

group('descriptions and explanations', () => {
  it('describes hands', () => {
    expect(describe(ev('Kc Kd Ks 7h 7c')).full).toBe('Full House, Kings full of Sevens')
    expect(describe(ev('5c 4d 3h 2s Ac')).full).toBe('Straight, Five-high')
    expect(describe(ev('As Ks Qs Js Ts')).full).toBe('Royal Flush')
    expect(describe(ev('Ts Th Ad 8c 4s')).full).toBe('One Pair, Tens')
  })
  it('explains who wins and why', () => {
    expect(explainComparison(ev('Ad Jd 9d 6d 3d'), ev('Tc 9d 8h 7s 6c'))).toBe('Flush beats Straight.')
    expect(explainComparison(ev('Kc Kd 5h 5s 2c'), ev('Ks Kh 4h 4s Ac'))).toBe(
      'Two Pair, Kings and Fives beats Two Pair, Kings and Fours.',
    )
    expect(explainComparison(ev('Ac Ad Kh 5s 2c'), ev('As Ah Qh Js Tc'))).toBe(
      'Both have One Pair, Aces; the kicker decides: King beats Queen.',
    )
    expect(explainComparison(ev('Ah Kh 9h 5h 3h'), ev('Ad Kd 9d 5d 2d'))).toBe(
      'Both have Flush, Ace-high; the fifth card decides: Three beats Two.',
    )
    expect(explainComparison(ev('Ac Kd Qh Js Tc'), ev('As Kh Qd Jc Th'))).toMatch(/pot is split/)
  })
  it('finds and orders the best five cards', () => {
    const b = bestHand(parseCards('7h Kc 2d Kd 7c Ks 3s'))
    expect(b.label.full).toBe('Full House, Kings full of Sevens')
    expect(b.cards.map(cardToString).join(' ')).toBe('Ks Kd Kc 7h 7c')
    expect(bestHand(parseCards('Ac 2d 3h 4s 5c 9d Jh')).cards.map(cardToString).join(' ')).toBe('5c 4s 3h 2d Ac')
  })
})

group('validated against known totals', () => {
  it('counts every category across all 2,598,960 five-card hands', () => {
    const counts = new Array(9).fill(0)
    let royals = 0
    const h = new Array<Card>(5)
    for (let a = 0; a < 48; a++)
      for (let b = a + 1; b < 49; b++)
        for (let c = b + 1; c < 50; c++)
          for (let d = c + 1; d < 51; d++)
            for (let e = d + 1; e < 52; e++) {
              h[0] = a
              h[1] = b
              h[2] = c
              h[3] = d
              h[4] = e
              const s = evaluate(h)
              counts[categoryOf(s)]++
              if (isRoyalFlush(s)) royals++
            }
    // Standard combinatorics totals; the hand rankings page shows these same numbers.
    expect(counts).toEqual([1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40])
    expect(royals).toBe(4)
    expect(counts.reduce((x, y) => x + y)).toBe(FIVE_CARD_HANDS)
  })

  it('matches a simple reference evaluator on 20,000 random 7-card hands', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 20000; i++) {
      const cards = shuffled(fullDeck(), rand).slice(0, 7)
      expect(evaluate(cards)).toBe(referenceBest(cards))
    }
  })
})

group('hand ranking examples', () => {
  it('every example is really the hand it claims', () => {
    for (const h of HAND_RANKINGS) {
      const cards = parseCards(h.example)
      const s = evaluate(cards)
      expect(categoryOf(s), h.name).toBe(h.category)
      expect(isRoyalFlush(s), h.name).toBe(h.name === 'Royal Flush')
      expect(new Set(cards).size).toBe(5)
    }
    // Royal (4) is listed separately from other straight flushes (36), so the list covers every hand.
    expect(HAND_RANKINGS.reduce((n, h) => n + h.fiveCardCount, 0)).toBe(FIVE_CARD_HANDS)
  })
})

// ---------- Reference implementation: slow, obviously-correct, sort based ----------
function reference5(cards: Card[]): number {
  const ranks = cards.map((c) => c >> 2).sort((a, b) => b - a)
  const suits = cards.map((c) => c & 3)
  const flush = suits.every((s) => s === suits[0])
  const uniq = [...new Set(ranks)]
  let straightHigh = -1
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0]
    else if (uniq.join(',') === '12,3,2,1,0') straightHigh = 3
  }
  const groups = uniq.map((r) => ({ r, n: ranks.filter((x) => x === r).length })).sort((a, b) => b.n - a.n || b.r - a.r)
  const order = groups.map((g) => g.r)
  const pack = (cat: number, rs: number[]) => rs.concat([0, 0, 0, 0, 0]).slice(0, 5).reduce((acc, r) => acc * 16 + r, cat)
  if (straightHigh >= 0 && flush) return pack(8, [straightHigh])
  if (groups[0].n === 4) return pack(7, order)
  if (groups[0].n === 3 && groups[1].n === 2) return pack(6, order)
  if (flush) return pack(5, ranks)
  if (straightHigh >= 0) return pack(4, [straightHigh])
  if (groups[0].n === 3) return pack(3, order)
  if (groups[0].n === 2 && groups[1].n === 2) return pack(2, order)
  if (groups[0].n === 2) return pack(1, order)
  return pack(0, ranks)
}

function referenceBest(cards: Card[]): number {
  let best = -1
  for (let skipA = 0; skipA < 7; skipA++)
    for (let skipB = skipA + 1; skipB < 7; skipB++) {
      best = Math.max(best, reference5(cards.filter((_, i) => i !== skipA && i !== skipB)))
    }
  return best
}
