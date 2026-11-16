import { Link } from 'react-router'
import { PlayingCard } from '../../components/PlayingCard'
import { PageHeader } from '../../components/ui'
import { GLOSSARY } from '../../learn/glossary'
import { LESSONS } from '../../learn/lessons'
import { parseCards } from '../../poker/cards'
import { useLearning } from '../../state/LearningProvider'

export function LearnPage() {
  const { completed } = useLearning()
  const done = LESSONS.filter((l) => completed.has(l.id)).length
  const next = LESSONS.find((l) => !completed.has(l.id))

  return (
    <div className="grid gap-6">
      <PageHeader title="Learn" subtitle="Texas Hold'em, from the rules to exact odds." />

      <Link to={next ? `/learn/rules/${next.id}` : '/learn/rules'} className="grid gap-4 rounded-2xl border border-line felt-glow p-5 transition-colors hover:border-emerald/60 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Rules guide</span>
          <span className="text-xs text-muted">
            {done} of {LESSONS.length} lessons complete
          </span>
        </div>
        <div className="grid gap-1">
          <h2 className="font-display text-2xl font-bold">{next ? (done === 0 ? 'Learn to play Texas Hold’em' : `Next: ${next.title}`) : 'You’ve finished the rules guide'}</h2>
          <p className="text-sm text-muted">{next ? next.summary : 'Review any lesson, or put it to work in the odds calculator.'}</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
          <div className="h-full rounded-full bg-emerald" style={{ width: `${(done / LESSONS.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-emerald">{next ? (done === 0 ? 'Start lesson 1 →' : 'Continue →') : 'See all lessons →'}</span>
      </Link>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/learn/hand-rankings" className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-emerald/60">
          <div className="flex -space-x-5">
            {parseCards('As Ks Qs Js Ts').map((c) => (
              <PlayingCard key={c} card={c} size="sm" flip={false} />
            ))}
          </div>
          <div className="grid gap-1">
            <h2 className="font-display text-lg font-bold">Hand rankings</h2>
            <p className="text-sm text-muted">All ten hands, with examples and how ties are broken.</p>
          </div>
        </Link>

        <Link to="/learn/odds" className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-emerald/60">
          <div className="flex items-end gap-1.5">
            {parseCards('Ah Ad').map((c) => (
              <PlayingCard key={c} card={c} size="sm" flip={false} />
            ))}
            <span className="px-0.5 pb-3 text-xs font-semibold text-muted">vs</span>
            {parseCards('Kc Ks').map((c) => (
              <PlayingCard key={c} card={c} size="sm" flip={false} />
            ))}
          </div>
          <div className="grid gap-1">
            <h2 className="font-display text-lg font-bold">Odds calculator</h2>
            <p className="text-sm text-muted">Exact win and split odds for any hands and board.</p>
          </div>
        </Link>

        <Link to="/learn/glossary" className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-emerald/60">
          <div className="flex h-[61px] flex-wrap content-end gap-1.5">
            {['Kicker', 'Nuts', 'Outs', 'Flop'].map((t) => (
              <span key={t} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold">
                {t}
              </span>
            ))}
          </div>
          <div className="grid gap-1">
            <h2 className="font-display text-lg font-bold">Glossary</h2>
            <p className="text-sm text-muted">{GLOSSARY.length} poker terms in plain English, searchable.</p>
          </div>
        </Link>
      </div>

      <section className="grid gap-2 rounded-2xl border border-dashed border-line p-4">
        <span className="text-sm font-semibold">Coming next: quizzes</span>
        <span className="text-xs text-muted">Hand rankings, who wins, tie-breakers and odds, from beginner to advanced.</span>
      </section>
    </div>
  )
}
