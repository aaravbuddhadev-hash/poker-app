/**
 * Cards are integers 0..51: rank * 4 + suit.
 * Ranks 0..12 = 2,3,4,5,6,7,8,9,T,J,Q,K,A. Suits 0..3 = clubs, diamonds, hearts, spades.
 * Integers keep the evaluator fast and make duplicate checks trivial.
 */
export type Card = number

export const RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const
export const SUIT_CHARS = ['c', 'd', 'h', 's'] as const
export const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'] as const
export const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'] as const

export const RANK_NAMES = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'] as const
export const RANK_PLURALS = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'] as const

export const rankOf = (c: Card): number => c >> 2
export const suitOf = (c: Card): number => c & 3
export const makeCard = (rank: number, suit: number): Card => rank * 4 + suit

export function isCard(v: unknown): v is Card {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 52
}

export class CardError extends Error {}

/** Parse "As", "Td", "10h" (case-insensitive) into a card. */
export function parseCard(text: string): Card {
  const m = /^(10|[2-9TJQKA])([cdhs])$/i.exec(text.trim())
  if (!m) throw new CardError(`Not a card: "${text}"`)
  const r = m[1] === '10' ? 8 : RANK_CHARS.indexOf(m[1].toUpperCase() as (typeof RANK_CHARS)[number])
  const s = SUIT_CHARS.indexOf(m[2].toLowerCase() as (typeof SUIT_CHARS)[number])
  return makeCard(r, s)
}

/** Parse a space-separated list such as "As Kd 7h". */
export function parseCards(text: string): Card[] {
  return text.trim() ? text.trim().split(/\s+/).map(parseCard) : []
}

export function cardToString(c: Card): string {
  return RANK_CHARS[rankOf(c)] + SUIT_CHARS[suitOf(c)]
}

/** Display rank: "10" instead of "T". */
export function rankLabel(c: Card): string {
  const r = RANK_CHARS[rankOf(c)]
  return r === 'T' ? '10' : r
}

export function cardName(c: Card): string {
  return `${RANK_NAMES[rankOf(c)]} of ${SUIT_NAMES[suitOf(c)]}`
}

export const isRed = (c: Card): boolean => suitOf(c) === 1 || suitOf(c) === 2

export function fullDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i)
}

/** Throws if any card is invalid or appears twice. */
export function assertValidUnique(cards: readonly Card[]): void {
  const seen = new Set<Card>()
  for (const c of cards) {
    if (!isCard(c)) throw new CardError(`Invalid card value: ${c}`)
    if (seen.has(c)) throw new CardError(`${cardToString(c)} is used more than once`)
    seen.add(c)
  }
}

/** Cards not in `used`, in deck order. */
export function remainingDeck(used: Iterable<Card>): Card[] {
  const u = new Set(used)
  return fullDeck().filter((c) => !u.has(c))
}

/** Fisher–Yates shuffle (any items) with crypto randomness when available. */
export function shuffled<T>(items: readonly T[], random: () => number = cryptoRandom): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function cryptoRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
  }
  return Math.random()
}
