import { Link } from 'react-router'
import { PlayingCard } from '../../components/PlayingCard'
import { PageHeader } from '../../components/ui'
import { parseCards } from '../../poker/cards'

const COMING = [
  { title: 'Rules guide', body: 'Blinds, betting rounds and showdowns, step by step, with lessons you can mark complete.' },
  { title: 'Glossary', body: 'Searchable poker terms with examples.' },
  { title: 'Quizzes', body: 'Hand rankings, who wins, tie-breakers and odds, from beginner to advanced.' },
]

export function LearnPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Learn" subtitle="Texas Hold'em, from hand rankings to exact odds." />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/learn/hand-rankings"
          className="group grid gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-emerald/60"
        >
          <div className="flex -space-x-5">
            {parseCards('As Ks Qs Js Ts').map((c) => (
              <PlayingCard key={c} card={c} size="md" flip={false} />
            ))}
          </div>
          <div className="grid gap-1">
            <h2 className="font-display text-xl font-bold">Hand rankings</h2>
            <p className="text-sm text-muted">All ten hands from Royal Flush to High Card, with real examples and how ties are broken.</p>
          </div>
          <span className="text-sm font-semibold text-emerald">Open the rankings →</span>
        </Link>

        <Link to="/learn/odds" className="group grid gap-4 rounded-2xl border border-line bg-felt/60 p-5 transition-colors hover:border-emerald/60">
          <div className="flex items-end gap-2">
            {parseCards('Ah Ad').map((c) => (
              <PlayingCard key={c} card={c} size="md" flip={false} />
            ))}
            <span className="px-1 pb-4 text-sm font-semibold text-muted">vs</span>
            {parseCards('Kc Ks').map((c) => (
              <PlayingCard key={c} card={c} size="md" flip={false} />
            ))}
          </div>
          <div className="grid gap-1">
            <h2 className="font-display text-xl font-bold">Odds calculator</h2>
            <p className="text-sm text-muted">Pick any hands and board. See each player's exact chance to win, lose or split, and why.</p>
          </div>
          <span className="text-sm font-semibold text-emerald">Compare hands →</span>
        </Link>
      </div>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-muted">Coming next</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMING.map((c) => (
            <div key={c.title} className="grid gap-1 rounded-2xl border border-dashed border-line p-4">
              <span className="font-semibold">{c.title}</span>
              <span className="text-xs text-muted">{c.body}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
