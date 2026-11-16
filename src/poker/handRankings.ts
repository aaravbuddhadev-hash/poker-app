import { HandCategory } from './evaluator'

export interface HandRankingInfo {
  /** 1 = strongest */
  position: number
  name: string
  category: HandCategory
  /** Example hand, best-first; checked by tests to really be this hand. */
  example: string
  /** Indexes into `example` of the cards that form the hand (others are kickers). */
  core: number[]
  summary: string
  tieBreak: string
  details: string[]
  /** Number of the 2,598,960 possible five-card hands that are this hand. Verified in tests. */
  fiveCardCount: number
}

export const FIVE_CARD_HANDS = 2_598_960

export const HAND_RANKINGS: HandRankingInfo[] = [
  {
    position: 1,
    name: 'Royal Flush',
    category: HandCategory.StraightFlush,
    example: 'As Ks Qs Js Ts',
    core: [0, 1, 2, 3, 4],
    summary: 'A, K, Q, J and 10, all of the same suit.',
    tieBreak: 'It can’t be beaten. Two royal flushes can only happen when all five are on the board, and then the pot is split.',
    details: [
      'A royal flush is simply the highest possible straight flush.',
      'There are only four, one per suit.',
    ],
    fiveCardCount: 4,
  },
  {
    position: 2,
    name: 'Straight Flush',
    category: HandCategory.StraightFlush,
    example: '9h 8h 7h 6h 5h',
    core: [0, 1, 2, 3, 4],
    summary: 'Five cards in a row, all of the same suit.',
    tieBreak: 'The straight flush with the higher top card wins.',
    details: [
      'The ace can play low in A-2-3-4-5 of one suit, the lowest straight flush (Five-high).',
      'Straights don’t wrap around: Q-K-A-2-3 is not a straight.',
    ],
    fiveCardCount: 36,
  },
  {
    position: 3,
    name: 'Four of a Kind',
    category: HandCategory.FourOfAKind,
    example: 'Qc Qd Qh Qs 7d',
    core: [0, 1, 2, 3],
    summary: 'All four cards of one rank, plus any fifth card.',
    tieBreak: 'Higher four of a kind wins. If two players share the same four on the board, the higher fifth card (kicker) wins.',
    details: ['Also called “quads”.'],
    fiveCardCount: 624,
  },
  {
    position: 4,
    name: 'Full House',
    category: HandCategory.FullHouse,
    example: 'Kc Kd Ks 7h 7c',
    core: [0, 1, 2, 3, 4],
    summary: 'Three of a kind plus a pair.',
    tieBreak: 'Compare the three of a kind first; if it’s the same, the higher pair wins.',
    details: ['Read it as “Kings full of Sevens”: the three-of-a-kind rank comes first.'],
    fiveCardCount: 3744,
  },
  {
    position: 5,
    name: 'Flush',
    category: HandCategory.Flush,
    example: 'Ad Jd 9d 6d 3d',
    core: [0, 1, 2, 3, 4],
    summary: 'Any five cards of the same suit, not in a row.',
    tieBreak: 'Compare the highest card, then the next, and so on through all five cards.',
    details: [
      'Suits never rank against each other: a flush in spades is not better than one in hearts.',
      'With seven cards you use your best five of the suit.',
    ],
    fiveCardCount: 5108,
  },
  {
    position: 6,
    name: 'Straight',
    category: HandCategory.Straight,
    example: 'Tc 9d 8h 7s 6c',
    core: [0, 1, 2, 3, 4],
    summary: 'Five cards in a row, in any suits.',
    tieBreak: 'The straight with the higher top card wins. Same top card means a split pot.',
    details: [
      'The ace can be high (10-J-Q-K-A, the “Broadway” straight) or low (A-2-3-4-5, the “wheel”), but not both at once.',
    ],
    fiveCardCount: 10200,
  },
  {
    position: 7,
    name: 'Three of a Kind',
    category: HandCategory.ThreeOfAKind,
    example: '8c 8h 8s Kd 3c',
    core: [0, 1, 2],
    summary: 'Three cards of the same rank.',
    tieBreak: 'Higher three of a kind wins. If equal, compare the two remaining cards, highest first.',
    details: ['Made with a pocket pair it’s often called a “set”; with one hole card and a pair on the board, “trips”.'],
    fiveCardCount: 54912,
  },
  {
    position: 8,
    name: 'Two Pair',
    category: HandCategory.TwoPair,
    example: 'Jh Jc 4s 4d Ah',
    core: [0, 1, 2, 3],
    summary: 'Two different pairs.',
    tieBreak: 'Compare the higher pair, then the lower pair, then the fifth card (kicker).',
    details: ['With three pairs among your seven cards, you play the best two and the best remaining card as the kicker.'],
    fiveCardCount: 123552,
  },
  {
    position: 9,
    name: 'One Pair',
    category: HandCategory.OnePair,
    example: 'Ts Th Ad 8c 4s',
    core: [0, 1],
    summary: 'Two cards of the same rank.',
    tieBreak: 'Higher pair wins. If equal, compare the three kickers one at a time, highest first.',
    details: ['Kickers decide a lot of pots: A-A-K beats A-A-Q.'],
    fiveCardCount: 1098240,
  },
  {
    position: 10,
    name: 'High Card',
    category: HandCategory.HighCard,
    example: 'Ac Qd 9h 6s 3c',
    core: [0],
    summary: 'None of the above. Your highest card plays.',
    tieBreak: 'Compare the highest card, then the next, through all five.',
    details: ['Described by its top card, e.g. “Ace-high”.'],
    fiveCardCount: 1302540,
  },
]
