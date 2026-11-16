import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarHeatmap } from '../components/CalendarHeatmap'
import { CumulativeChart, MonthlyChart, OutcomeDonut } from '../components/charts'
import { PlusIcon, SearchIcon } from '../components/icons'
import { MonthCalendar } from '../components/MonthCalendar'
import { SessionCard } from '../components/SessionCard'
import { Button, Card, EmptyState, inputCls, MoneyText, PageHeader, Segmented, StatTile } from '../components/ui'
import {
  filterSessions,
  gameTypeBreakdown,
  mostActiveMonth,
  SORT_LABELS,
  sortSessions,
  summarize,
  yearsWithSessions,
  type Outcome,
  type SessionFilter,
  type SortKey,
} from '../domain/analytics'
import { GAME_TYPES, type GameType } from '../domain/session'
import { formatDate, formatDuration, formatMonth, yearOf } from '../lib/dates'
import { useSessionForm } from '../state/SessionFormProvider'
import { useSessions } from '../state/SessionsProvider'
import { useSettings } from '../state/SettingsProvider'

type View = 'history' | 'calendar' | 'analytics'
const VIEWS = [
  { value: 'history' as const, label: 'History' },
  { value: 'calendar' as const, label: 'Calendar' },
  { value: 'analytics' as const, label: 'Analytics' },
]

export function SessionsPage() {
  const [params, setParams] = useSearchParams()
  const view: View = (['history', 'calendar', 'analytics'] as const).find((v) => v === params.get('view')) ?? 'history'
  const { sessions, loading } = useSessions()
  const { openNew } = useSessionForm()
  const { update } = useSettings()

  return (
    <div className="grid gap-5">
      <PageHeader title="Sessions" subtitle="Every result you've recorded." />
      <Segmented label="Sessions view" options={VIEWS} value={view} onChange={(v) => setParams({ view: v }, { replace: true })} className="w-full sm:w-auto sm:justify-self-start" />
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      ) : sessions.length === 0 ? (
        <EmptyState title="No sessions yet" body="Once you record sessions, your history, calendar and analytics show up here.">
          <Button variant="primary" onClick={() => openNew()}>
            <PlusIcon width={18} height={18} /> Add session
          </Button>
          <Button onClick={() => update({ demoMode: true })}>Explore with demo data</Button>
        </EmptyState>
      ) : view === 'history' ? (
        <HistoryView />
      ) : view === 'calendar' ? (
        <CalendarView />
      ) : (
        <AnalyticsView />
      )}
    </div>
  )
}

const OUTCOMES = [
  { value: 'all', label: 'All' },
  { value: 'positive', label: 'Up' },
  { value: 'negative', label: 'Down' },
  { value: 'even', label: 'Even' },
] as const

function HistoryView() {
  const { sessions } = useSessions()
  const { openEdit } = useSessionForm()
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState<Outcome | 'all'>('all')
  const [gameType, setGameType] = useState<GameType | 'Unspecified' | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')

  const results = useMemo(() => {
    const filter: SessionFilter = {
      query: query || undefined,
      outcome: outcome === 'all' ? undefined : outcome,
      gameType: gameType || undefined,
      from: from || undefined,
      to: to || undefined,
    }
    return sortSessions(filterSessions(sessions, filter), sort)
  }, [sessions, query, outcome, gameType, from, to, sort])
  const net = useMemo(() => summarize(results).netCents, [results])
  const filtered = Boolean(query || outcome !== 'all' || gameType || from || to)
  const [shown, setShown] = useState(50)

  return (
    <div className="grid gap-4">
      <Card>
        <div className="grid gap-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
            <input type="search" aria-label="Search notes" placeholder="Search notes and game types" value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputCls} pl-10`} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-xs font-semibold text-muted">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Game type
              <select value={gameType} onChange={(e) => setGameType(e.target.value as GameType | 'Unspecified' | '')} className={inputCls}>
                <option value="">All games</option>
                {GAME_TYPES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
                <option value="Unspecified">Not specified</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={inputCls}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented label="Result" options={OUTCOMES} value={outcome} onChange={setOutcome} />
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setOutcome('all')
                  setGameType('')
                  setFrom('')
                  setTo('')
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-baseline justify-between gap-3 px-1 text-sm">
        <span className="text-muted">
          {results.length} session{results.length === 1 ? '' : 's'}
          {filtered ? ' match' : ''}
        </span>
        <span className="font-semibold">
          Net <MoneyText cents={net} />
        </span>
      </div>

      {results.length === 0 ? (
        <EmptyState title="No matching sessions" body="Try a wider date range or clear the filters." />
      ) : (
        <div className="grid gap-2">
          {results.slice(0, shown).map((s) => (
            <SessionCard key={s.id} session={s} onClick={() => openEdit(s)} />
          ))}
          {results.length > shown && (
            <Button onClick={() => setShown((n) => n + 50)} className="justify-self-center">
              Show {Math.min(50, results.length - shown)} more
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function CalendarView() {
  const { sessions, today } = useSessions()
  const { openEdit, openNew } = useSessionForm()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(today)
  const daySessions = useMemo(() => sortSessions(sessions.filter((s) => s.date === selected), 'oldest'), [sessions, selected])

  return (
    <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-start">
      <Card>
        <MonthCalendar sessions={sessions} month={month} onMonthChange={setMonth} selected={selected} onSelect={setSelected} today={today} />
      </Card>
      <Card title={selected ? formatDate(selected) : 'Pick a day'}>
        {selected && (
          <div className="grid gap-2">
            {daySessions.length === 0 ? (
              <p className="text-sm text-muted">No sessions on this day.</p>
            ) : (
              daySessions.map((s) => <SessionCard key={s.id} session={s} onClick={() => openEdit(s)} compact />)
            )}
            <Button size="sm" className="mt-1 justify-self-start" onClick={() => openNew(selected)}>
              <PlusIcon width={16} height={16} /> Add session on this day
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function AnalyticsView() {
  const { sessions, today } = useSessions()
  const years = useMemo(() => yearsWithSessions(sessions), [sessions])
  const [year, setYear] = useState(() => years[0] ?? yearOf(today))
  const summary = useMemo(() => summarize(sessions), [sessions])
  const busiest = useMemo(() => mostActiveMonth(sessions), [sessions])
  const games = useMemo(() => gameTypeBreakdown(sessions), [sessions])
  const yearCount = sessions.filter((s) => yearOf(s.date) === year).length

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <h2 className="font-display text-xl font-bold">Personal records</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Largest positive" value={summary.best ? <MoneyText cents={summary.best.netCents} /> : '—'} sub={summary.best ? formatDate(summary.best.date) : 'None yet'} />
          <StatTile label="Largest negative" value={summary.worst ? <MoneyText cents={summary.worst.netCents} /> : '—'} sub={summary.worst ? formatDate(summary.worst.date) : 'None'} />
          <StatTile
            label="Longest session"
            value={summary.longest?.durationMinutes ? formatDuration(summary.longest.durationMinutes) : '—'}
            sub={summary.longest ? formatDate(summary.longest.date) : 'Add durations to track this'}
          />
          <StatTile label="Most active month" value={busiest ? formatMonth(busiest.month) : '—'} sub={busiest ? `${busiest.count} sessions` : undefined} />
          <StatTile label="Total sessions" value={summary.count} />
          <StatTile label="Total recorded hours" value={summary.totalMinutes ? (summary.totalMinutes / 60).toFixed(1) : '—'} sub={summary.averageMinutes ? `Avg ${formatDuration(summary.averageMinutes)} per session` : undefined} />
        </div>
      </section>

      <Card title="Cumulative results, all time">
        <CumulativeChart sessions={sessions} height={260} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Monthly net results (last 12 months with sessions)">
          <MonthlyChart sessions={sessions} />
        </Card>
        <Card title="Session outcomes">
          <OutcomeDonut summary={summary} />
        </Card>
      </div>

      <Card
        title={`${yearCount} session${yearCount === 1 ? '' : 's'} in ${year}`}
        action={
          years.length > 1 && (
            <select aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputCls} h-9 w-auto`}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )
        }
      >
        <CalendarHeatmap sessions={sessions} year={year} today={today} />
      </Card>

      <Card title="By game type">
        {games.length < 2 ? (
          <p className="text-sm text-muted">Record sessions in at least two game types to compare them.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-semibold">Game</th>
                  <th className="py-2 pr-3 font-semibold text-right">Sessions</th>
                  <th className="py-2 pr-3 font-semibold text-right">Net</th>
                  <th className="py-2 pr-3 font-semibold text-right">Average</th>
                  <th className="py-2 font-semibold text-right">Positive</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.gameType} className="border-t border-line">
                    <td className="py-2.5 pr-3 font-semibold">{g.gameType === 'Unspecified' ? 'Not specified' : g.gameType}</td>
                    <td className="py-2.5 pr-3 text-right tabular">{g.count}</td>
                    <td className="py-2.5 pr-3 text-right"><MoneyText cents={g.netCents} /></td>
                    <td className="py-2.5 pr-3 text-right"><MoneyText cents={g.averageCents} /></td>
                    <td className="py-2.5 text-right tabular">{Math.round(g.positiveRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
