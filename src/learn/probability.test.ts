import { describe, expect, it } from 'vitest'
import { choose, hitChance, oneIn, ruleOfTwoAndFour, startingHandOdds, UNSEEN_ON_FLOP, UNSEEN_ON_TURN } from './probability'

describe('probability', () => {
  it('computes combinations', () => {
    expect(choose(52, 2)).toBe(1326)
    expect(choose(52, 5)).toBe(2598960)
    expect(choose(47, 2)).toBe(1081)
    expect(choose(3, 5)).toBe(0)
  })

  it('matches hand-worked draw odds', () => {
    // Flush draw on the flop: miss twice = (38/47)(37/46).
    expect(hitChance(9, UNSEEN_ON_FLOP, 2)).toBeCloseTo(1 - (38 / 47) * (37 / 46), 12)
    expect(hitChance(9, UNSEEN_ON_FLOP, 2)).toBeCloseTo(0.3497, 4)
    expect(hitChance(8, UNSEEN_ON_FLOP, 2)).toBeCloseTo(0.3145, 4)
    expect(hitChance(4, UNSEEN_ON_FLOP, 2)).toBeCloseTo(0.1647, 4)
    // One card to come: simply outs / unseen.
    expect(hitChance(9, UNSEEN_ON_TURN, 1)).toBeCloseTo(9 / 46, 12)
    expect(hitChance(9, UNSEEN_ON_FLOP, 1)).toBeCloseTo(9 / 47, 12)
  })

  it('agrees with brute-force counting', () => {
    // Deal 2 cards from 47 where 9 are "outs"; count deals containing at least one.
    let hit = 0
    let all = 0
    for (let a = 0; a < 47; a++)
      for (let b = a + 1; b < 47; b++) {
        all++
        if (a < 9 || b < 9) hit++
      }
    expect(hitChance(9, 47, 2)).toBeCloseTo(hit / all, 12)
  })

  it('shows the rule of 2 and 4 is a close approximation', () => {
    expect(ruleOfTwoAndFour(9, 2)).toBe(0.36)
    expect(ruleOfTwoAndFour(9, 1)).toBe(0.18)
    expect(Math.abs(ruleOfTwoAndFour(8, 2) - hitChance(8, 47, 2))).toBeLessThan(0.01)
  })

  it('computes starting hand odds', () => {
    expect(startingHandOdds.anyPocketPair).toBeCloseTo(78 / 1326, 12)
    expect(oneIn(startingHandOdds.anyPocketPair)).toBe('17')
    expect(oneIn(startingHandOdds.specificPocketPair)).toBe('221')
    expect(startingHandOdds.suited).toBeCloseTo(312 / 1326, 12)
    expect(startingHandOdds.setOnFlop).toBeCloseTo(0.1176, 4)
  })
})
