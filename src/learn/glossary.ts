export interface GlossaryEntry {
  id: string
  term: string
  /** Other names people use; searchable. */
  aliases?: string[]
  definition: string
  example?: string
  /** Ids of related entries (checked by tests). */
  related: string[]
}

export const GLOSSARY: GlossaryEntry[] = [
  { id: 'action', term: 'Action', definition: 'Whose turn it is to act, or the betting activity in a hand.', example: '“The action is on you” means it’s your turn.', related: ['position', 'under-the-gun'] },
  { id: 'all-in', term: 'All-in', definition: 'Putting all of your remaining chips into the pot. You can’t be forced out of a hand for not having enough chips; you can only win as much from each opponent as you put in.', related: ['side-pot', 'pot'] },
  { id: 'ante', term: 'Ante', definition: 'A small forced bet every player puts in before a hand, used in many tournaments alongside the blinds.', related: ['blinds'] },
  { id: 'bad-beat', term: 'Bad beat', definition: 'When a hand that was far ahead loses to an unlikely card on a later street.', example: 'Aces lose to kings when a king comes on the river.', related: ['outs', 'equity'] },
  { id: 'bet', term: 'Bet', definition: 'Putting chips in when no one else has bet yet in the current betting round.', related: ['raise', 'call', 'check'] },
  { id: 'big-blind', term: 'Big blind', aliases: ['BB'], definition: 'The larger forced bet, posted by the player two seats to the left of the button. It sets the minimum bet for the hand.', related: ['small-blind', 'blinds', 'button'] },
  { id: 'blinds', term: 'Blinds', definition: 'The two forced bets (small and big blind) posted before cards are dealt, so every hand has something to play for.', related: ['small-blind', 'big-blind', 'ante'] },
  { id: 'board', term: 'Board', aliases: ['Community cards'], definition: 'The five shared cards dealt face up in the middle: the flop, turn and river. Every player can use them.', related: ['flop', 'turn', 'river', 'hole-cards'] },
  { id: 'broadway', term: 'Broadway', definition: 'The highest straight: 10-J-Q-K-A. Also used for any of those five ranks.', related: ['straight', 'wheel'] },
  { id: 'burn-card', term: 'Burn card', definition: 'A card the dealer discards face down before dealing the flop, the turn and the river, so no one can gain from a glimpse of the top card.', related: ['flop', 'turn', 'river'] },
  { id: 'button', term: 'Button', aliases: ['Dealer button', 'Dealer'], definition: 'A disc marking the dealer position. It moves one seat clockwise every hand, and the button acts last after the flop.', related: ['position', 'small-blind', 'big-blind'] },
  { id: 'call', term: 'Call', definition: 'Matching the current bet to stay in the hand.', related: ['bet', 'raise', 'fold'] },
  { id: 'check', term: 'Check', definition: 'Passing the action without betting. Only possible when no one has bet yet in the current round.', related: ['bet', 'check-raise'] },
  { id: 'check-raise', term: 'Check-raise', definition: 'Checking, then raising after an opponent bets in the same round.', related: ['check', 'raise'] },
  { id: 'connectors', term: 'Connectors', definition: 'Two hole cards next to each other in rank, like 8-9. “Suited connectors” are also the same suit.', related: ['suited', 'straight'] },
  { id: 'equity', term: 'Equity', definition: 'Your share of the pot on average if all remaining cards were dealt with no more betting. 60% equity means you’d win 60% of the pot over many runs.', example: 'Aces against kings before the flop have about 82% equity.', related: ['outs', 'pot-odds'] },
  { id: 'flop', term: 'Flop', definition: 'The first three community cards, dealt face up together, followed by the second betting round.', related: ['turn', 'river', 'board'] },
  { id: 'flush', term: 'Flush', definition: 'Five cards of the same suit that are not in sequence. Beats a straight, loses to a full house.', related: ['flush-draw', 'straight'] },
  { id: 'flush-draw', term: 'Flush draw', definition: 'Four cards of one suit, needing one more. There are 9 cards left of that suit, so it has 9 outs.', related: ['outs', 'flush'] },
  { id: 'fold', term: 'Fold', definition: 'Giving up your hand and any claim to the pot. Your cards go into the muck.', related: ['muck', 'call'] },
  { id: 'full-house', term: 'Full house', aliases: ['Boat'], definition: 'Three of a kind plus a pair, like K-K-K-7-7 (“kings full of sevens”).', related: ['set', 'trips'] },
  { id: 'gutshot', term: 'Gutshot', aliases: ['Inside straight draw'], definition: 'A straight draw missing one rank in the middle, so only one rank (4 cards) completes it.', example: '6-7-9-10 needs an 8.', related: ['open-ended', 'outs'] },
  { id: 'heads-up', term: 'Heads-up', definition: 'A hand or game with only two players. With two players, the button posts the small blind and acts first before the flop.', related: ['button', 'blinds'] },
  { id: 'hole-cards', term: 'Hole cards', aliases: ['Pocket cards'], definition: 'Your two private cards, dealt face down.', related: ['board', 'pocket-pair'] },
  { id: 'kicker', term: 'Kicker', definition: 'An unpaired card in your best five that breaks a tie between hands of the same type.', example: 'A-A-K beats A-A-Q: the king kicker wins.', related: ['split-pot', 'pair'] },
  { id: 'limp', term: 'Limp', definition: 'Just calling the big blind before the flop instead of raising.', related: ['call', 'big-blind', 'preflop'] },
  { id: 'muck', term: 'Muck', definition: 'The pile of folded and discarded cards; also, to throw your hand away without showing it.', related: ['fold'] },
  { id: 'nuts', term: 'Nuts', definition: 'The best possible hand given the cards on the board.', example: 'On K♠ Q♠ 7♠ 2♦ 3♣, the nuts is A♠ J♠: the flush A-K-Q-J-7. No straight or full house is possible on that board.', related: ['board'] },
  { id: 'offsuit', term: 'Offsuit', definition: 'Two hole cards of different suits, written with an “o”, like AKo.', related: ['suited'] },
  { id: 'open-ended', term: 'Open-ended straight draw', aliases: ['OESD'], definition: 'Four cards in a row that can be completed at either end, giving 8 outs.', example: '6-7-8-9 is completed by any 5 or 10.', related: ['gutshot', 'outs'] },
  { id: 'outs', term: 'Outs', definition: 'The unseen cards that would improve your hand to the one you’re hoping for.', related: ['flush-draw', 'open-ended', 'equity'] },
  { id: 'overpair', term: 'Overpair', definition: 'A pocket pair higher than every card on the board.', example: 'Q-Q on a 10-7-2 flop.', related: ['pocket-pair'] },
  { id: 'pair', term: 'Pair', definition: 'Two cards of the same rank.', related: ['pocket-pair', 'kicker'] },
  { id: 'pocket-pair', term: 'Pocket pair', definition: 'Hole cards of the same rank, like 8-8. You’re dealt one about 1 time in 17.', related: ['set', 'overpair', 'hole-cards'] },
  { id: 'position', term: 'Position', definition: 'Where you sit relative to the button. Acting later (“in position”) is an advantage because you see what others do first.', related: ['button', 'under-the-gun'] },
  { id: 'pot', term: 'Pot', definition: 'All the chips bet in the current hand, won by the best hand at showdown or by the last player left.', related: ['side-pot', 'split-pot'] },
  { id: 'pot-odds', term: 'Pot odds', definition: 'The size of the pot compared with the cost of a call. Compare it with your chance of winning to judge whether a call pays off over time.', example: 'Calling 10 to win a pot of 40 is 4-to-1 pot odds: you need to win at least 1 time in 5 (20%).', related: ['equity', 'outs'] },
  { id: 'preflop', term: 'Preflop', definition: 'The first betting round, after hole cards are dealt and before the flop.', related: ['flop', 'blinds'] },
  { id: 'raise', term: 'Raise', definition: 'Increasing the current bet. In No-Limit, a raise must be at least as big as the previous bet or raise.', related: ['bet', 'three-bet', 'check-raise'] },
  { id: 'river', term: 'River', definition: 'The fifth and last community card, followed by the final betting round.', related: ['turn', 'showdown'] },
  { id: 'set', term: 'Set', definition: 'Three of a kind made with a pocket pair plus one matching card on the board.', related: ['trips', 'pocket-pair'] },
  { id: 'showdown', term: 'Showdown', definition: 'After the last betting round, the remaining players reveal their cards and the best five-card hand wins.', related: ['river', 'split-pot'] },
  { id: 'side-pot', term: 'Side pot', definition: 'A separate pot for bets an all-in player can’t match. The all-in player can only win the main pot.', related: ['all-in', 'pot'] },
  { id: 'small-blind', term: 'Small blind', aliases: ['SB'], definition: 'The smaller forced bet, posted by the player directly to the left of the button; usually half the big blind.', related: ['big-blind', 'blinds'] },
  { id: 'split-pot', term: 'Split pot', aliases: ['Chop'], definition: 'When two or more players have exactly the same best five-card hand, they divide the pot equally.', related: ['kicker', 'showdown'] },
  { id: 'straight', term: 'Straight', definition: 'Five cards in sequence of any suits. The ace can be high (Broadway) or low (the wheel), but straights don’t wrap around.', related: ['broadway', 'wheel', 'open-ended'] },
  { id: 'suited', term: 'Suited', definition: 'Two hole cards of the same suit, written with an “s”, like AKs.', related: ['offsuit', 'connectors', 'flush'] },
  { id: 'three-bet', term: '3-bet', definition: 'The first re-raise. Before the flop the big blind counts as the first bet, so the first raise is the 2nd bet and a re-raise is the 3rd.', related: ['raise'] },
  { id: 'tilt', term: 'Tilt', definition: 'Frustration or emotion that leads to worse decisions, often after a bad beat. Taking a break is the usual cure.', related: ['bad-beat'] },
  { id: 'trips', term: 'Trips', definition: 'Three of a kind made with one hole card and a pair on the board.', related: ['set'] },
  { id: 'turn', term: 'Turn', aliases: ['Fourth street'], definition: 'The fourth community card, followed by the third betting round.', related: ['flop', 'river'] },
  { id: 'under-the-gun', term: 'Under the gun', aliases: ['UTG'], definition: 'The seat directly left of the big blind, first to act before the flop.', related: ['position', 'big-blind'] },
  { id: 'wheel', term: 'Wheel', definition: 'The lowest straight: A-2-3-4-5, with the ace playing low.', related: ['straight', 'broadway'] },
]

export function searchGlossary(query: string, entries: readonly GlossaryEntry[] = GLOSSARY): GlossaryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...entries]
  const score = (e: GlossaryEntry) => {
    const names = [e.term, ...(e.aliases ?? [])].map((s) => s.toLowerCase())
    if (names.some((n) => n === q)) return 0
    if (names.some((n) => n.startsWith(q))) return 1
    if (names.some((n) => n.includes(q))) return 2
    if (e.definition.toLowerCase().includes(q) || e.example?.toLowerCase().includes(q)) return 3
    return -1
  }
  return entries
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.e.term.localeCompare(b.e.term))
    .map((x) => x.e)
}
