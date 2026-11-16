import { Link } from 'react-router'
import { PlayingCard } from '../../components/PlayingCard'
import { PageHeader } from '../../components/ui'
import { parseCards } from '../../poker/cards'
import { FIVE_CARD_HANDS, HAND_RANKINGS } from '../../poker/handRankings'

function oneIn(count: number): string {
  const n = FIVE_CARD_HANDS / count
  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-US')
}

export function HandRankingsPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link to="/learn" className="text-sm font-semibold text-emerald hover:underline">
          ← Learn
        </Link>
        <PageHeader title="Hand rankings" subtitle="Strongest to weakest. Your best five cards from the seven available always play." />
      </div>

      <p className="max-w-prose rounded-2xl border border-line bg-surface-2 p-4 text-sm text-muted">
        <strong className="text-fg">Suits are all equal.</strong> A heart is never better than a spade. When two hands are the same type, the
        ranks of the cards break the tie, and if every card matches, the pot is split.
      </p>

      <ol className="grid gap-3">
        {HAND_RANKINGS.map((h) => {
          const cards = parseCards(h.example)
          return (
            <li key={h.name} className="rounded-2xl border border-line bg-surface p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="grid min-w-0 gap-1.5">
                  <div className="flex items-baseline gap-3">
                    <span className="w-6 shrink-0 font-display text-lg font-bold text-gold tabular">{h.position}</span>
                    <h2 className="font-display text-xl font-bold">{h.name}</h2>
                  </div>
                  <p className="pl-9 text-sm">{h.summary}</p>
                  <p className="pl-9 text-sm text-muted">
                    <span className="font-semibold text-fg">Ties: </span>
                    {h.tieBreak}
                  </p>
                </div>
                <div className="flex gap-1.5 pl-9 md:pl-0" aria-label={`Example: ${h.example}`}>
                  {cards.map((c, i) => (
                    <PlayingCard key={c} card={c} size="sm" flip={false} dim={!h.core.includes(i)} />
                  ))}
                </div>
              </div>
              <details className="group mt-3 pl-9">
                <summary className="cursor-pointer list-none text-sm font-semibold text-emerald hover:underline">
                  <span className="group-open:hidden">More about {h.name.toLowerCase()}</span>
                  <span className="hidden group-open:inline">Show less</span>
                </summary>
                <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-muted">
                  {h.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                  <li>
                    {h.fiveCardCount.toLocaleString('en-US')} of the {FIVE_CARD_HANDS.toLocaleString('en-US')} possible five-card hands, about 1 in{' '}
                    {oneIn(h.fiveCardCount)}.
                  </li>
                  {h.core.length < 5 && <li>Faded cards in the example are kickers: they only matter to break ties.</li>}
                </ul>
              </details>
            </li>
          )
        })}
      </ol>

      <Link to="/learn/odds" className="justify-self-start rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-on-accent hover:brightness-110">
        Try hands in the odds calculator
      </Link>
    </div>
  )
}
