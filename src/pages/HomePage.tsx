import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CumulativeChart } from '../components/charts'
import { PlusIcon } from '../components/icons'
import { SessionCard } from '../components/SessionCard'
import { Button, Card, EmptyState, MoneyText, Segmented, StatTile } from '../components/ui'
import { useCountUp } from '../components/useCountUp'
import { inRange, outcomeOf, RANGE_LABELS, sortSessions, summarize, type RangeKey } from '../domain/analytics'
import { formatDate, formatDuration } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useSessionForm } from '../state/SessionFormProvider'
import { useSessions } from '../state/SessionsProvider'
import { useSettings } from '../state/SettingsProvider'

const RANGES = (Object.keys(RANGE_LABELS) as RangeKey[]).map((value) => ({
  value,
  label: value === 'ytd' ? 'Year' : value === 'all' ? 'All' : value.toUpperCase(),
}))

export function HomePage() {
  const { sessions, loading, today } = useSessions()
  const { openNew, openEdit } = useSessionForm()
  const { settings, update } = useSettings()
  const [range, setRange] = useState<RangeKey>('90d')

  const summary = useMemo(() => summarize(sessions), [sessions])
  const ranged = useMemo(() => inRange(sessions, range, today), [sessions, range, today])
  const rangedNet = useMemo(() => summarize(ranged).netCents, [ranged])
  const recent = useMemo(() => sortSessions(sessions, 'newest').slice(0, 5), [sessions])
  const firstDate = useMemo(() => sortSessions(sessions, 'oldest')[0]?.date, [sessions])
  const animatedNet = useCountUp(summary.netCents)

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-surface" aria-label="Loading" />

  if (sessions.length === 0) {
    return (
      <div className="grid gap-6">
        <section className="felt-glow rounded-3xl border border-line p-6 md:p-10 grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Welcome to River</span>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight max-w-xl">Your poker sessions, on the record.</h1>
          <p className="text-muted max-w-lg">
            Record each session's result, see your lifetime net and trends, and learn Texas Hold'em along the way. Everything stays on this device.
          </p>
        </section>
        <EmptyState title="No sessions yet" body="Add your first session to start your lifetime results, or look around with fictional demo data first.">
          <Button variant="primary" onClick={() => openNew()}>
            <PlusIcon width={18} height={18} /> Record first session
          </Button>
          <Button onClick={() => update({ demoMode: true })}>Explore with demo data</Button>
        </EmptyState>
      </div>
    )
  }

  const tone = outcomeOf(summary.netCents)

  return (
    <div className="grid gap-5 md:gap-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="felt-glow relative overflow-hidden rounded-3xl border border-line p-5 md:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Lifetime net results</span>
            <span
              className={`font-display font-bold tabular tracking-tight text-[clamp(2.5rem,9vw,4.5rem)] leading-none ${tone === 'positive' ? 'text-pos' : tone === 'negative' ? 'text-neg' : 'text-fg'}`}
            >
              {formatMoney(animatedNet, settings.currency, { signed: true })}
            </span>
            <span className="text-sm text-muted">
              {summary.count} session{summary.count === 1 ? '' : 's'} recorded{firstDate ? ` since ${formatDate(firstDate)}` : ''}
            </span>
          </div>
          <Button variant="primary" onClick={() => openNew()} className="hidden md:inline-flex">
            <PlusIcon width={18} height={18} /> Add session
          </Button>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total sessions" value={summary.count} sub={`${summary.positive} up · ${summary.negative} down · ${summary.even} even`} />
        <StatTile
          label="Positive sessions"
          value={summary.positiveRate === null ? '—' : `${Math.round(summary.positiveRate * 100)}%`}
          sub={`${summary.positive} of ${summary.count}`}
        />
        <StatTile label="Average per session" value={summary.averageCents === null ? '—' : <MoneyText cents={summary.averageCents} />} />
        <StatTile
          label="Recorded playtime"
          value={summary.totalMinutes ? formatDuration(summary.totalMinutes) : '—'}
          sub={summary.timedCount ? `${summary.timedCount} timed session${summary.timedCount === 1 ? '' : 's'}` : 'Add durations to track this'}
        />
        <StatTile
          label="Largest positive"
          value={summary.best ? <MoneyText cents={summary.best.netCents} /> : '—'}
          sub={summary.best ? formatDate(summary.best.date) : 'No positive sessions yet'}
        />
        <StatTile
          label="Largest negative"
          value={summary.worst ? <MoneyText cents={summary.worst.netCents} /> : '—'}
          sub={summary.worst ? formatDate(summary.worst.date) : 'No negative sessions'}
        />
        <StatTile label="Negative sessions" value={summary.negative} sub={`${summary.even} break-even`} />
        <StatTile
          label="Average length"
          value={summary.averageMinutes ? formatDuration(summary.averageMinutes) : '—'}
          sub={summary.longest?.durationMinutes ? `Longest ${formatDuration(summary.longest.durationMinutes)}` : undefined}
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="grid">
            <h2 className="text-sm font-semibold text-muted">Results over {RANGE_LABELS[range].toLowerCase()}</h2>
            <span className="text-lg font-bold">
              <MoneyText cents={rangedNet} /> <span className="text-sm font-medium text-muted">· {ranged.length} sessions</span>
            </span>
          </div>
          <Segmented label="Chart range" options={RANGES} value={range} onChange={setRange} />
        </div>
        {ranged.length ? (
          <CumulativeChart sessions={ranged} />
        ) : (
          <p className="grid h-[220px] place-items-center text-sm text-muted">No sessions in this period.</p>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:gap-6">
        <Card title="Recent sessions" action={<Link to="/sessions" className="text-sm font-semibold text-emerald hover:underline">View all</Link>}>
          <div className="grid gap-2">
            {recent.map((s) => (
              <SessionCard key={s.id} session={s} onClick={() => openEdit(s)} />
            ))}
          </div>
        </Card>
        <Card title="Daily puzzle">
          <div className="grid gap-3">
            <div className="flex gap-2" aria-hidden>
              {['A♠', 'A♥', 'K♠', 'K♥'].map((card, i) => (
                <span
                  key={card}
                  className={`grid h-16 w-11 place-items-center rounded-lg border border-line bg-white font-bold shadow ${card.includes('♥') ? 'text-red-600' : 'text-neutral-900'} ${i === 2 ? 'ml-3' : ''}`}
                >
                  {card}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted">
              A new probability challenge every day: guess each hand's chance to win, then see the exact answer. Arrives with the poker engine in Phase 6.
            </p>
            <Link to="/puzzle" className="text-sm font-semibold text-emerald hover:underline">
              See what's planned
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
