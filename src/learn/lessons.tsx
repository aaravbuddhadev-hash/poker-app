import type { ComponentType } from 'react'
import { Link } from 'react-router'
import { OutsCalculator } from '../components/learn/OutsCalculator'
import { ShowdownExample } from '../components/learn/ShowdownExample'
import { StreetStepper } from '../components/learn/StreetStepper'
import { TableSeats } from '../components/learn/TableSeats'
import { Term } from '../components/learn/Term'
import { PlayingCard } from '../components/PlayingCard'
import { parseCards } from '../poker/cards'
import { HAND_RANKINGS } from '../poker/handRankings'
import { GLOSSARY } from './glossary'
import { COMMON_DRAWS, hitChance, oneIn, percent, startingHandOdds, UNSEEN_ON_FLOP, UNSEEN_ON_TURN } from './probability'

export interface Lesson {
  id: string
  title: string
  minutes: number
  summary: string
  Content: ComponentType
}

/**
 * Example deals used in the lessons. Each `expect` field states what the
 * lesson text claims; lessons.test.ts checks every one against the engine.
 */
export const LESSON_EXAMPLES = {
  growingHand: { hole: 'Kh 7d', board: 'Kc 7s 2h 9s Ks', expect: { flop: 'Two Pair, Kings and Sevens', river: 'Full House, Kings full of Sevens' } },
  drawingHand: { hole: '8s 9s', board: '7s Tc 2s Jd 4h', expect: { flop: 'High Card, Ten-high', turn: 'Straight, Jack-high', flopOuts: 15 } },
  showdown: {
    players: [
      { name: 'Player 1', hole: 'Ah Kh' },
      { name: 'Player 2', hole: 'Qs Qd' },
    ],
    board: 'Kd 8h 2h Qc 5h',
    expect: { winners: [0], reason: 'Flush beats Three of a Kind.' },
  },
  kicker: {
    players: [
      { name: 'Player 1', hole: 'As Qd' },
      { name: 'Player 2', hole: 'Ad Jh' },
    ],
    board: 'Ah 9c 6d 4s 2c',
    expect: { winners: [0], reason: 'Both have One Pair, Aces; the kicker decides: Queen beats Jack.' },
  },
  boardPlays: {
    players: [
      { name: 'Player 1', hole: '2c 3d' },
      { name: 'Player 2', hole: '9h 8h' },
    ],
    board: 'Tc Jd Qh Ks As',
    expect: { winners: [0, 1] },
  },
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">{children}</p>
)

export const LESSONS: Lesson[] = [
  {
    id: 'goal',
    title: 'The goal and the deck',
    minutes: 3,
    summary: 'What you’re trying to do, and the 52 cards you do it with.',
    Content: () => (
      <>
        <p>
          Texas Hold’em is played with one standard deck of <strong>52 cards</strong>: four suits (spades ♠, hearts ♥, diamonds ♦, clubs ♣), each
          with 13 ranks from 2 up to ace. Aces are the highest card, but they can also play low in the straight A-2-3-4-5.
        </p>
        <div className="flex justify-center gap-2" aria-label="One ace of each suit">
          {parseCards('As Ah Ad Ac').map((c) => (
            <PlayingCard key={c} card={c} size="md" flip={false} />
          ))}
        </div>
        <p>
          Each player gets two private cards, and five shared cards are dealt face up in the middle. You make the best five-card hand you can
          from any mix of your two cards and the five shared ones: both of yours, one, or none.
        </p>
        <h2>Winning the pot</h2>
        <p>
          Players put chips into the <Term id="pot">pot</Term> as they bet. You win it in one of two ways:
        </p>
        <ul>
          <li>
            <strong>Best hand at showdown:</strong> if two or more players are still in after the last card, the best five-card hand wins.
          </li>
          <li>
            <strong>Everyone else folds:</strong> if you bet and every other player gives up, you win without showing your cards.
          </li>
        </ul>
        <Note>Suits are all equal in Hold’em. They only matter for making flushes, never for breaking ties.</Note>
      </>
    ),
  },
  {
    id: 'cards',
    title: 'Hole cards and the board',
    minutes: 3,
    summary: 'Your two private cards, the five shared ones, and how they combine.',
    Content: () => (
      <>
        <p>
          Every player is dealt two <Term id="hole-cards">hole cards</Term> face down, one at a time, starting with the player to the left of the
          button. Only you see yours.
        </p>
        <p>
          The five community cards, called the <Term id="board">board</Term>, are dealt face up in three stages: the <Term id="flop">flop</Term>{' '}
          (three cards), the <Term id="turn">turn</Term> (one card) and the <Term id="river">river</Term> (one card). There’s a betting round
          before the flop and after each stage.
        </p>
        <p>Step through this deal to see how a hand grows as cards arrive:</p>
        <StreetStepper
          hole={LESSON_EXAMPLES.growingHand.hole}
          board={LESSON_EXAMPLES.growingHand.board}
          caption="King-high before the flop, two pair on the flop, and a full house on the river."
        />
        <h2>Playing the board</h2>
        <p>
          If the five community cards are better than anything you can make with your own cards, you “play the board”. Everyone still in can
          use those same five, so the best you can do is tie.
        </p>
      </>
    ),
  },
  {
    id: 'blinds',
    title: 'The button and the blinds',
    minutes: 4,
    summary: 'Who deals, who pays the forced bets, and who acts first.',
    Content: () => (
      <>
        <p>
          A disc called the <Term id="button">dealer button</Term> marks which seat is the dealer for the hand. After each hand it moves one seat
          clockwise, so everyone takes turns in every position.
        </p>
        <ul>
          <li>
            The <Term id="small-blind">small blind</Term> is the player directly left of the button. They post a forced bet, usually half the big
            blind.
          </li>
          <li>
            The <Term id="big-blind">big blind</Term> is the next player. They post the full minimum bet.
          </li>
        </ul>
        <p>
          The <Term id="blinds">blinds</Term> make sure there’s always something to win. Without them, players could fold every hand until they
          were dealt aces.
        </p>
        <TableSeats />
        <p>
          Before the flop, the player left of the big blind acts first. That seat is called <Term id="under-the-gun">under the gun</Term>. After
          the flop, the first player still in to the left of the button acts first, and the button acts last, which is why the button is the
          best <Term id="position">position</Term>.
        </p>
        <Note>
          <strong className="text-fg">Heads-up exception:</strong> with only two players, the button posts the small blind and acts first before the
          flop, then last on every later round.
        </Note>
      </>
    ),
  },
  {
    id: 'rounds',
    title: 'The four betting rounds',
    minutes: 4,
    summary: 'Preflop, flop, turn and river, and when each round ends.',
    Content: () => (
      <>
        <ol>
          <li>
            <strong>
              <Term id="preflop">Preflop</Term>:
            </strong>{' '}
            after the hole cards are dealt. Action starts under the gun and goes clockwise; the big blind acts last.
          </li>
          <li>
            <strong>Flop:</strong> the dealer discards a <Term id="burn-card">burn card</Term>, then deals three community cards. Betting starts
            with the first player still in to the left of the button.
          </li>
          <li>
            <strong>Turn:</strong> another burn card, then the fourth community card and a betting round.
          </li>
          <li>
            <strong>River:</strong> a last burn card, the fifth community card and the final betting round.
          </li>
        </ol>
        <p>
          A betting round ends when every player still in has put in the same amount (or is <Term id="all-in">all-in</Term>) and everyone has had
          a chance to act. If all but one player folds at any point, the hand ends right away and that player wins the pot.
        </p>
        <StreetStepper
          hole={LESSON_EXAMPLES.drawingHand.hole}
          board={LESSON_EXAMPLES.drawingHand.board}
          caption="On the flop this is only Ten-high, but with 15 cards that make a straight or flush. The turn completes the straight."
        />
      </>
    ),
  },
  {
    id: 'actions',
    title: 'Check, bet, call, raise, fold',
    minutes: 4,
    summary: 'The five things you can do when it’s your turn.',
    Content: () => (
      <>
        <p>What you can do depends on whether anyone has bet yet in the current round.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <h3 className="mb-2 font-semibold">No bet yet</h3>
            <ul>
              <li>
                <Term id="check">Check</Term>: pass and stay in.
              </li>
              <li>
                <Term id="bet">Bet</Term>: put chips in first.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <h3 className="mb-2 font-semibold">Someone has bet</h3>
            <ul>
              <li>
                <Term id="fold">Fold</Term>: give up the hand.
              </li>
              <li>
                <Term id="call">Call</Term>: match the bet.
              </li>
              <li>
                <Term id="raise">Raise</Term>: make the bet bigger.
              </li>
            </ul>
          </div>
        </div>
        <p>
          Going <Term id="all-in">all-in</Term> means putting in all your chips. You can never be forced out for not having enough, but you can
          only win as much from each player as you put in yourself; extra bets go into a <Term id="side-pot">side pot</Term>.
        </p>
        <h2>Betting limits</h2>
        <ul>
          <li>
            <strong>No-Limit:</strong> bet any amount up to all your chips. A raise must be at least as big as the previous bet or raise.
          </li>
          <li>
            <strong>Pot-Limit:</strong> the most you can bet is the size of the pot.
          </li>
          <li>
            <strong>Limit:</strong> bets and raises come in fixed sizes.
          </li>
        </ul>
        <p>
          Checking and then raising after someone bets, a <Term id="check-raise">check-raise</Term>, is allowed in most games.
        </p>
      </>
    ),
  },
  {
    id: 'showdown',
    title: 'Showdown and hand rankings',
    minutes: 4,
    summary: 'How the winner is decided when the last card is dealt.',
    Content: () => (
      <>
        <p>
          If two or more players are still in after the river betting, there’s a <Term id="showdown">showdown</Term>: players reveal their hole
          cards and the best five-card hand wins. The last player to bet or raise on the river shows first; if everyone checked, the first player
          left of the button shows first.
        </p>
        <p>
          “The cards speak”: your hand is whatever your cards make, not what you announce. Hands rank from strongest to weakest:
        </p>
        <ol className="columns-1 sm:columns-2">
          {HAND_RANKINGS.map((h) => (
            <li key={h.name}>{h.name}</li>
          ))}
        </ol>
        <p>
          <Link to="/learn/hand-rankings" className="font-semibold text-emerald hover:underline">
            See every hand with examples →
          </Link>
        </p>
        <p>Who wins this showdown? Decide, then reveal:</p>
        <ShowdownExample players={LESSON_EXAMPLES.showdown.players} board={LESSON_EXAMPLES.showdown.board} />
      </>
    ),
  },
  {
    id: 'ties',
    title: 'Kickers and split pots',
    minutes: 4,
    summary: 'What happens when two players have the same kind of hand.',
    Content: () => (
      <>
        <p>
          When two hands are the same type, compare the cards that make the hand first (the higher pair, the higher straight), then the
          remaining cards, called <Term id="kicker">kickers</Term>, from highest down.
        </p>
        <ul>
          <li>Only your best five cards count. A sixth card never breaks a tie.</li>
          <li>Suits never break a tie.</li>
          <li>
            If the five cards match exactly, the pot is split equally: a <Term id="split-pot">split pot</Term>.
          </li>
        </ul>
        <p>Both players have a pair of aces here. Who wins?</p>
        <ShowdownExample players={LESSON_EXAMPLES.kicker.players} board={LESSON_EXAMPLES.kicker.board} />
        <p>And here, the board is a straight that neither player can improve:</p>
        <ShowdownExample players={LESSON_EXAMPLES.boardPlays.players} board={LESSON_EXAMPLES.boardPlays.board} />
      </>
    ),
  },
  {
    id: 'odds',
    title: 'Outs and odds',
    minutes: 5,
    summary: 'Counting the cards that help you, and turning them into a percentage.',
    Content: () => (
      <>
        <p>
          <Term id="outs">Outs</Term> are the unseen cards that would give you the hand you’re hoping for. After the flop you can see five cards
          (your two plus three on the board), so {UNSEEN_ON_FLOP} are unseen. After the turn, {UNSEEN_ON_TURN} are.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 pr-3 font-semibold">Draw</th>
                <th className="py-2 pr-3 text-right font-semibold">Outs</th>
                <th className="py-2 pr-3 text-right font-semibold">Flop → river</th>
                <th className="py-2 text-right font-semibold">Turn → river</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_DRAWS.map((d) => (
                <tr key={d.name} className="border-t border-line">
                  <td className="py-2 pr-3">
                    <span className="font-semibold">{d.name}</span>
                    <span className="block text-xs text-muted">{d.how}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular">{d.outs}</td>
                  <td className="py-2 pr-3 text-right tabular">{percent(hitChance(d.outs, UNSEEN_ON_FLOP, 2))}</td>
                  <td className="py-2 text-right tabular">{percent(hitChance(d.outs, UNSEEN_ON_TURN, 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>The rule of 2 and 4</h2>
        <p>
          A quick estimate at the table: multiply your outs by <strong>4</strong> on the flop (two cards to come) or by <strong>2</strong> on the
          turn (one card to come). Compare it with the exact answer:
        </p>
        <OutsCalculator />
        <Note>
          An out only helps if it gives you the best hand. Sometimes the card you want also helps an opponent, for example a flush card that
          pairs the board and gives someone a full house.
        </Note>
        <h2>Starting hand facts</h2>
        <ul>
          <li>
            You’re dealt a pocket pair about 1 time in {oneIn(startingHandOdds.anyPocketPair)} ({percent(startingHandOdds.anyPocketPair)}).
          </li>
          <li>
            A specific pair, such as two aces, about 1 time in {oneIn(startingHandOdds.specificPocketPair)}.
          </li>
          <li>Two cards of the same suit: {percent(startingHandOdds.suited)} of hands.</li>
          <li>
            With a pocket pair, the flop gives you a <Term id="set">set</Term> or better {percent(startingHandOdds.setOnFlop)} of the time (about 1 in{' '}
            {oneIn(startingHandOdds.setOnFlop)}).
          </li>
        </ul>
        <p>
          To see exact odds for any situation, try the{' '}
          <Link to="/learn/odds" className="font-semibold text-emerald hover:underline">
            odds calculator
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: 'terms',
    title: 'Talk like a player',
    minutes: 3,
    summary: 'Ten terms you’ll hear at every table.',
    Content: () => {
      const ids = ['position', 'nuts', 'pot-odds', 'equity', 'set', 'trips', 'gutshot', 'three-bet', 'heads-up', 'tilt']
      const entries = ids.map((id) => GLOSSARY.find((g) => g.id === id)!)
      return (
        <>
          <p>Poker has a lot of slang. These ten come up constantly:</p>
          <dl className="grid gap-3">
            {entries.map((e) => (
              <div key={e.id} className="rounded-xl border border-line bg-surface-2 p-4">
                <dt className="font-semibold">
                  <Term id={e.id}>{e.term}</Term>
                </dt>
                <dd className="mt-1 text-sm text-muted">{e.definition}</dd>
              </div>
            ))}
          </dl>
          <p>
            <Link to="/learn/glossary" className="font-semibold text-emerald hover:underline">
              Browse the full glossary →
            </Link>
          </p>
        </>
      )
    },
  },
]

export const lessonById = (id: string | undefined) => LESSONS.find((l) => l.id === id)
