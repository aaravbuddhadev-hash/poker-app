import { describe, expect, it } from 'vitest'
import { CardError, parseCards } from './cards'
import { boardCount, calculateEquity } from './equity'

const hands = (...hs: string[]) => hs.map(parseCards)

describe('calculateEquity', () => {
  it('counts outs exactly on the turn (hand-checkable)', () => {
    // AA vs KK on Qd 7c 2s Js: only the two remaining kings win for KK.
    // No straight or flush is possible for either player.
    const r = calculateEquity({ hands: hands('Ah Ad', 'Kc Ks'), board: parseCards('Qd 7c 2s Js') })
    expect(r.total).toBe(44)
    expect(r.players[1].winCount).toBe(2)
    expect(r.players[0].winCount).toBe(42)
    expect(r.splitRate).toBe(0)
    expect(r.players[0].equity).toBeCloseTo(42 / 44, 12)
  })

  it('handles a fully dealt board with a split pot', () => {
    // Board is a Broadway straight; neither player can improve it.
    const r = calculateEquity({ hands: hands('2c 3d', '4h 5s'), board: parseCards('Ac Kd Qh Js Tc') })
    expect(r.total).toBe(1)
    expect(r.splitRate).toBe(1)
    expect(r.players.map((p) => p.equity)).toEqual([0.5, 0.5])
    expect(r.players.map((p) => p.win)).toEqual([0, 0])
  })

  it('checks every flop: equities sum to 1 and identical hands split evenly', () => {
    const r = calculateEquity({ hands: hands('As Ks', 'Ah Kh'), board: [] })
    expect(r.total).toBe(1712304)
    expect(r.players[0].equity).toBeCloseTo(r.players[1].equity, 12) // symmetric suits
    expect(r.players[0].equity + r.players[1].equity).toBeCloseTo(1, 12)
    // Mirror-image hands: each wins exactly as often as the other (by its own flush).
    expect(r.players[0].winCount).toBe(r.players[1].winCount)
    expect(r.players[0].win + r.players[1].win + r.splitRate).toBeCloseTo(1, 12)
  })

  it('gives the well-known ~82% for aces vs kings preflop', () => {
    const r = calculateEquity({ hands: hands('Ac Ad', 'Kh Ks'), board: [] })
    expect(r.players[0].equity).toBeGreaterThan(0.81)
    expect(r.players[0].equity).toBeLessThan(0.83)
    const sum = r.players[0].win + r.players[1].win + r.splitRate
    expect(sum).toBeCloseTo(1, 12)
  })

  it('supports three players with exact enumeration on the flop', () => {
    const r = calculateEquity({ hands: hands('As Ah', 'Kd Kc', '9h 8h'), board: parseCards('7h 6c 2h') })
    expect(r.total).toBe(boardCount({ hands: hands('As Ah', 'Kd Kc', '9h 8h'), board: parseCards('7h 6c 2h') }))
    expect(r.total).toBe(903) // 52 - 6 hole - 3 board = 43 unseen; C(43, 2)
    const totalEquity = r.players.reduce((s, p) => s + p.equity, 0)
    expect(totalEquity).toBeCloseTo(1, 12)
    // The straight-flush draw with two overcards to the board is a real contender.
    expect(r.players[2].equity).toBeGreaterThan(0.4)
  })

  it('rejects duplicate cards and bad input', () => {
    expect(() => calculateEquity({ hands: hands('As Ah', 'As Kc'), board: [] })).toThrow(CardError)
    expect(() => calculateEquity({ hands: hands('As Ah', 'Kd Kc'), board: parseCards('Ah 2c 3d') })).toThrow(/Ah/)
    expect(() => calculateEquity({ hands: hands('As Ah'), board: [] })).toThrow(/two players/)
    expect(() => calculateEquity({ hands: [parseCards('As')].concat(hands('Kd Kc')), board: [] })).toThrow(/two cards/)
  })

  it('reports progress', () => {
    const seen: number[] = []
    calculateEquity({ hands: hands('Ac Ad', 'Kh Ks'), board: parseCards('2c') }, (d) => seen.push(d))
    expect(seen.at(-1)).toBe(boardCount({ hands: hands('Ac Ad', 'Kh Ks'), board: parseCards('2c') }))
  })
})
