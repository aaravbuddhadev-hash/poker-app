import { Link } from 'react-router'
import { CheckIcon } from '../../components/icons'
import { PageHeader, cx } from '../../components/ui'
import { LESSONS } from '../../learn/lessons'
import { useLearning } from '../../state/LearningProvider'

export function RulesGuidePage() {
  const { completed } = useLearning()
  const done = LESSONS.filter((l) => completed.has(l.id)).length
  const next = LESSONS.find((l) => !completed.has(l.id))

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link to="/learn" className="text-sm font-semibold text-emerald hover:underline">
          ← Learn
        </Link>
        <PageHeader title="Rules guide" subtitle="Texas Hold’em from your first hand to showdown, in short lessons." />
      </div>

      <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">
            {done} of {LESSONS.length} lessons complete
          </span>
          {next ? (
            <Link to={`/learn/rules/${next.id}`} className="text-sm font-semibold text-emerald hover:underline">
              {done === 0 ? 'Start with lesson 1' : `Continue: ${next.title}`} →
            </Link>
          ) : (
            <span className="text-sm font-semibold text-gold">All lessons complete</span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Lessons complete" aria-valuemin={0} aria-valuemax={LESSONS.length} aria-valuenow={done}>
          <div className="h-full rounded-full bg-emerald transition-all duration-500" style={{ width: `${(done / LESSONS.length) * 100}%` }} />
        </div>
      </section>

      <ol className="grid gap-2">
        {LESSONS.map((l, i) => {
          const isDone = completed.has(l.id)
          return (
            <li key={l.id}>
              <Link to={`/learn/rules/${l.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-emerald/60">
                <span
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold',
                    isDone ? 'bg-emerald text-on-accent' : 'border border-line bg-surface-2 text-muted',
                  )}
                  aria-label={isDone ? 'Complete' : `Lesson ${i + 1}`}
                >
                  {isDone ? <CheckIcon width={16} height={16} strokeWidth={3} /> : i + 1}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="font-semibold">{l.title}</span>
                  <span className="truncate text-sm text-muted">{l.summary}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{l.minutes} min</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
