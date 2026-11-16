/**
 * Hand-written questions (rules, outs) plus terminology questions built from
 * the glossary. Probability answers come from the probability module, never
 * typed in.
 */
import { GLOSSARY } from '../learn/glossary'
import { hitChance, oneIn, startingHandOdds, UNSEEN_ON_FLOP, UNSEEN_ON_TURN } from '../learn/probability'
import type { ChoiceQuestion, Difficulty, NumberQuestion, Question } from './types'

const rule = (difficulty: Difficulty, id: string, prompt: string, choices: string[], answer: number, explanation: string): ChoiceQuestion => ({
  id: `rules:${id}`,
  category: 'rules',
  difficulty,
  type: 'choice',
  prompt,
  choices,
  answer,
  explanation,
})

export const RULE_QUESTIONS: ChoiceQuestion[] = [
  rule('beginner', 'hole', 'How many cards does each player get face down?', ['One', 'Two', 'Three', 'Four'], 1, 'Each player is dealt two private hole cards.'),
  rule('beginner', 'board', 'How many community cards are dealt in total?', ['Three', 'Four', 'Five', 'Seven'], 2, 'Three on the flop, one on the turn and one on the river: five in all.'),
  rule('beginner', 'first-round', 'What is the first betting round called?', ['Preflop', 'Flop', 'Turn', 'River'], 0, 'Preflop happens after the hole cards are dealt and before any community cards.'),
  rule('beginner', 'flop-count', 'How many cards come on the flop?', ['One', 'Two', 'Three', 'Five'], 2, 'The flop is three community cards dealt together.'),
  rule('beginner', 'check', 'No one has bet yet this round. Which action keeps you in without putting in chips?', ['Check', 'Call', 'Raise', 'Fold'], 0, 'Checking passes the action; it’s only allowed when no one has bet yet in the round.'),
  rule('beginner', 'bb-seat', 'Which seat posts the big blind?', ['The button', 'Directly left of the button', 'Two seats left of the button', 'Directly right of the button'], 2, 'The small blind is directly left of the button and the big blind is the next seat.'),
  rule('intermediate', 'utg', 'Who acts first before the flop?', ['The small blind', 'The big blind', 'The player left of the big blind', 'The button'], 2, 'The seat left of the big blind, called “under the gun”, acts first preflop.'),
  rule('intermediate', 'postflop-first', 'Who acts first after the flop?', ['The first player still in to the left of the button', 'The big blind, always', 'Whoever raised before the flop', 'The button'], 0, 'After the flop, action starts with the first active player to the button’s left; the button acts last.'),
  rule('intermediate', 'burns', 'How many burn cards are used in a hand that reaches the river?', ['None', 'One', 'Two', 'Three'], 3, 'One card is burned before each of the flop, turn and river.'),
  rule('intermediate', 'fold-win', 'Everyone folds to your bet on the turn. What happens?', ['You win the pot without showing', 'The river is dealt anyway', 'You must show your cards', 'The pot carries to the next hand'], 0, 'If everyone else folds, the hand ends immediately and the last player in wins the pot.'),
  rule('intermediate', 'min-raise', 'No-Limit: one player bets 10 and the next raises to 30. What is the smallest legal re-raise, in total?', ['40', '50', '60', '30'], 1, 'The last raise was 20 (from 10 to 30), so a re-raise must add at least 20 more: 30 + 20 = 50.'),
  rule('intermediate', 'suits', 'Do suits ever break a tie between two hands?', ['No, never', 'Yes, spades are highest', 'Yes, hearts are highest', 'Only between flushes'], 0, 'All suits are equal in Hold’em. Equal hands split the pot.'),
  rule('advanced', 'hu-blind', 'With only two players, who posts the small blind?', ['The button', 'The other player', 'Both players', 'Neither'], 0, 'Heads-up, the button posts the small blind and the other player posts the big blind.'),
  rule('advanced', 'hu-first', 'With only two players, who acts first before the flop?', ['The button (small blind)', 'The big blind', 'Whoever has fewer chips', 'The last player to win a pot'], 0, 'Heads-up, the button acts first before the flop and last on every later round.'),
  rule('advanced', 'side-pot', 'A player is all-in for 50. Two others each bet 100 more. What can the all-in player win?', ['Only the main pot', 'Everything in the middle', 'Nothing', 'Only the side pot'], 0, 'An all-in player can only win what they matched from each opponent: the main pot. Extra bets form a side pot.'),
  rule('advanced', 'show-first', 'Everyone checked on the river. Who shows their cards first?', ['The first player still in to the left of the button', 'The big blind', 'The last player who bet on the turn', 'The button'], 0, 'With no river bet, showdown starts with the first active player to the button’s left.'),
  rule('advanced', 'play-board', 'Can your best hand use none of your hole cards?', ['Yes, that’s “playing the board”', 'No, you must use both', 'No, you must use at least one', 'Only in a split pot'], 0, 'In Hold’em you make the best five from any of your seven cards, including all five on the board.'),
]

const outs = (difficulty: Difficulty, id: string, prompt: string, choices: string[], answer: number, explanation: string): ChoiceQuestion => ({
  id: `probability:${id}`,
  category: 'probability',
  difficulty,
  type: 'choice',
  prompt,
  choices,
  answer,
  explanation,
})

const pctQ = (difficulty: Difficulty, id: string, prompt: string, value: number, explanation: string): NumberQuestion => ({
  id: `probability:${id}`,
  category: 'probability',
  difficulty,
  type: 'number',
  prompt,
  unit: '%',
  min: 0,
  max: 100,
  answer: Math.round(value * 1000) / 10,
  tolerance: 4,
  explanation,
})

export const PROBABILITY_QUESTIONS: Question[] = [
  outs('beginner', 'flush-outs', 'You hold four cards of one suit after the flop. How many outs do you have to make a flush?', ['9', '8', '4', '13'], 0, '13 cards per suit minus the 4 you can see leaves 9.'),
  outs('beginner', 'oesd-outs', 'You have 6-7-8-9 after the flop. How many outs complete the straight?', ['8', '4', '9', '6'], 0, 'Any 5 or 10 completes it: four of each, so 8 outs.'),
  outs('beginner', 'gutshot-outs', 'You have 6-7-9-10 after the flop. How many outs complete the straight?', ['4', '8', '2', '6'], 0, 'Only an 8 works, and there are four of them.'),
  outs(
    'beginner',
    'pocket-pair',
    'About how often are you dealt a pocket pair?',
    [`1 in ${oneIn(startingHandOdds.anyPocketPair)}`, '1 in 4', '1 in 50', `1 in ${oneIn(startingHandOdds.specificPocketPair)}`],
    0,
    `13 ranks × 6 suit pairs = 78 of the 1,326 possible starting hands: about 1 in ${oneIn(startingHandOdds.anyPocketPair)}. (1 in ${oneIn(startingHandOdds.specificPocketPair)} is for one specific pair, like aces.)`,
  ),
  pctQ('intermediate', 'flush-river', 'Flush draw on the flop (9 outs). What’s your chance to make the flush by the river?', hitChance(9, UNSEEN_ON_FLOP, 2), `1 − (38/47 × 37/46) = ${(hitChance(9, UNSEEN_ON_FLOP, 2) * 100).toFixed(1)}%. The rule of 4 estimate is 36%.`),
  pctQ('intermediate', 'oesd-river', 'Open-ended straight draw on the flop (8 outs). What’s your chance to hit by the river?', hitChance(8, UNSEEN_ON_FLOP, 2), `1 − (39/47 × 38/46) = ${(hitChance(8, UNSEEN_ON_FLOP, 2) * 100).toFixed(1)}%. The rule of 4 estimate is 32%.`),
  pctQ('intermediate', 'flush-turn', 'Flush draw on the turn (9 outs, one card to come). What’s your chance to hit on the river?', hitChance(9, UNSEEN_ON_TURN, 1), `9 good cards out of 46 unseen = ${(hitChance(9, UNSEEN_ON_TURN, 1) * 100).toFixed(1)}%. The rule of 2 estimate is 18%.`),
  pctQ('intermediate', 'set-flop', 'You hold a pocket pair. What’s the chance the flop gives you a set or better?', startingHandOdds.setOnFlop, `1 − C(48,3)/C(50,3) = ${(startingHandOdds.setOnFlop * 100).toFixed(1)}%, about 1 in ${oneIn(startingHandOdds.setOnFlop)}.`),
  pctQ('intermediate', 'gutshot-river', 'Gutshot on the flop (4 outs). What’s your chance to hit by the river?', hitChance(4, UNSEEN_ON_FLOP, 2), `1 − (43/47 × 42/46) = ${(hitChance(4, UNSEEN_ON_FLOP, 2) * 100).toFixed(1)}%.`),
]

// ---- Terminology from the glossary ----
const TERM_LEVEL: Record<Difficulty, string[]> = {
  beginner: ['blinds', 'board', 'button', 'call', 'check', 'flop', 'fold', 'hole-cards', 'pot', 'raise', 'river', 'showdown', 'turn', 'suited'],
  intermediate: ['all-in', 'kicker', 'outs', 'pocket-pair', 'position', 'preflop', 'split-pot', 'set', 'trips', 'under-the-gun', 'wheel', 'broadway', 'offsuit', 'limp'],
  advanced: ['equity', 'pot-odds', 'nuts', 'side-pot', 'gutshot', 'open-ended', 'three-bet', 'check-raise', 'overpair', 'burn-card', 'heads-up', 'muck', 'connectors'],
}

/** Glossary terms whose definition doesn't give the answer away by repeating the term. */
function usable(id: string) {
  const g = GLOSSARY.find((x) => x.id === id)
  if (!g) return null
  const words = [g.term, ...(g.aliases ?? [])].map((w) => w.toLowerCase())
  return words.some((w) => g.definition.toLowerCase().includes(w)) ? null : g
}

export function termQuestions(difficulty: Difficulty, rng: () => number): ChoiceQuestion[] {
  const pool = TERM_LEVEL[difficulty].map(usable).filter((g) => g !== null)
  const all = GLOSSARY
  return pool.map((g) => {
    // Three distractors from the same level first, then anywhere.
    const others = [...pool, ...all].filter((x, i, arr) => x.id !== g.id && arr.findIndex((y) => y.id === x.id) === i)
    const picks: string[] = []
    while (picks.length < 3) {
      const o = others[Math.floor(rng() * Math.min(others.length, pool.length + 4))]
      if (!picks.includes(o.term)) picks.push(o.term)
    }
    const answer = Math.floor(rng() * 4)
    const choices = [...picks]
    choices.splice(answer, 0, g.term)
    return {
      id: `terms:${g.id}`,
      category: 'terms',
      difficulty,
      type: 'choice',
      prompt: `Which term means: “${g.definition}”`,
      choices,
      answer,
      explanation: `${g.term}: ${g.definition}${g.example ? ` Example: ${g.example}` : ''}`,
    }
  })
}
