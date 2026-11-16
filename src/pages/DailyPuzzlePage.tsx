import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { PokerTable } from '../components/PokerTable'
import { Button, Card, PageHeader, StatTile, cx } from '../components/ui'
import { formatDate } from '../lib/dates'
import { remainingDeck, shuffled, type Card as PokerCard } from '../poker/cards'
import { bestHand, explainComparison } from '../poker/evaluator'
import { KIND_LABEL, msUntilNextPuzzle, puzzleForDate, utcDateKey } from '../puzzle/daily'
import { explainPuzzle } from '../puzzle/explain'
import { accuracy, evenSplit, puzzleStats, rebalance, type Submission } from '../puzzle/scoring'
import { useAuth } from '../state/AuthProvider'
import { useEquity } from '../state/useEquity'
import { usePuzzleHistory } from '../state/usePuzzleHistory'

const PLAYER_COLORS = ['#3DD68C', '#D4B062', '#6EA8FE']
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`

function useUtcToday() {
  const [today, setToday] = useState(() => utcDateKey())
  const [msLeft, setMsLeft] = useState(() => msUntilNextPuzzle())
  useEffect(() => {
    const t = window.setInterval(() => {
      setToday(utcDateKey())
      setMsLeft(msUntilNextPuzzle())
    }, 30_000)
    return () => window.clearInterval(t)
  }, [])
  return { today, msLeft }
}

function formatCountdown(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function DailyPuzzlePage() {
  const { user } = useAuth()
  const { today, msLeft } = useUtcToday()
  const puzzle = useMemo(() => puzzleForDate(today), [today])
  const { submissions, save } = usePuzzleHistory()
  const saved = submissions[today]
  const players = puzzle.hands.length
  const [prediction, setPrediction] = useState<number[]>(() => evenSplit(players))
  const [runout, setRunout] = useState<PokerCard[] | null>(null)
  const [shownDate, setShownDate] = useState(today)
  const equity = useEquity(puzzle.hands, puzzle.board)
  const stats = puzzleStats(submissions, today)

  // A new UTC day brings a new puzzle: start fresh (adjusting state during render).
  if (shownDate !== today) {
    setShownDate(today)
    setPrediction(evenSplit(players))
    setRunout(null)
  }

  const result = equity.status === 'done' ? equity.result : null

  function submit() {
    if (!result) return
    const eq = result.players.map((p) => p.equity)
    save(today, {
      kind: puzzle.kind,
      players,
      prediction,
      equity: eq,
      win: result.players.map((p) => p.win),
      tie: result.players.map((p) => p.tie),
      splitRate: result.splitRate,
      accuracy: accuracy(prediction, eq),
      submittedAt: new Date().toISOString(),
    } satisfies Submission)
  }

  // "Deal the rest": one random way the board could finish, scored by the engine.
  const board: (PokerCard | null)[] = [...puzzle.board, ...(runout ?? [])]
  while (board.length < 5) board.push(null)
  const showdown = useMemo(() => {
    if (!runout) return null
    const full = [...puzzle.board, ...runout]
    const bests = puzzle.hands.map((h) => bestHand([...h, ...full]))
    const top = Math.max(...bests.map((b) => b.score))
    const winners = bests.flatMap((b, i) => (b.score === top ? [i] : []))
    const others = bests.filter((b) => b.score !== top).map((b) => b.score)
    return {
      bests,
      winners,
      reason: winners.length > 1 ? explainComparison(top, top) : explainComparison(top, Math.max(...others)),
      highlight: new Set(winners.flatMap((i) => bests[i].cards)),
    }
  }, [runout, puzzle])

  const lines = saved && result ? explainPuzzle(puzzle, result) : []

  const seats = puzzle.hands.map((h, i) => ({
    name: `Player ${i + 1}`,
    cards: h,
    color: PLAYER_COLORS[i],
    winner: showdown?.winners.includes(i),
    caption: showdown
      ? showdown.bests[i].label.full
      : saved
        ? `${pct(saved.equity[i])} equity`
        : puzzle.board.length
          ? bestHand([...h, ...puzzle.board]).label.full
          : undefined,
  }))

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Daily Puzzle"
        subtitle={`#${puzzle.number} · ${formatDate(puzzle.date)} · the same puzzle for everyone today`}
        action={
          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
            Streak <strong className="text-gold tabular">{stats.currentStreak}</strong> {stats.currentStreak === 1 ? 'day' : 'days'}
          </span>
        }
      />

      <section className="grid gap-4">
        <div className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            {KIND_LABEL[puzzle.kind]} · {players} players
          </span>
          <h2 className="font-display text-2xl font-bold">What share of the pot does each player win on average?</h2>
          <p className="text-sm text-muted">
            Count a split pot as shared. Everyone stays in to showdown; the remaining {5 - puzzle.board.length} board cards are unknown.
          </p>
        </div>

        <PokerTable
          seats={seats}
          board={board}
          highlight={showdown?.highlight}
          dimOthers={!!showdown}
          dealKey={puzzle.date}
          label={runout ? 'Showdown' : KIND_LABEL[puzzle.kind]}
        />
      </section>

      {!saved ? (
        <Card title="Your prediction">
          <div className="grid gap-4">
            {puzzle.hands.map((_, i) => (
              <div key={i} className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor={`pred-${i}`} className="flex items-center gap-2 font-semibold">
                    <span className="size-2.5 rounded-full" style={{ background: PLAYER_COLORS[i] }} aria-hidden />
                    Player {i + 1}
                  </label>
                  <span className="font-display text-xl font-bold tabular">{prediction[i]}%</span>
                </div>
                <input
                  id={`pred-${i}`}
                  type="range"
                  min={0}
                  max={100}
                  value={prediction[i]}
                  onChange={(e) => setPrediction((p) => rebalance(p, i, Number(e.target.value)))}
                  className="h-8 w-full cursor-pointer"
                  style={{ accentColor: PLAYER_COLORS[i] }}
                />
              </div>
            ))}
            <p className="text-xs text-muted">The shares always add up to 100%. Moving one slider rescales the others.</p>
            <Button variant="primary" className="justify-self-start" disabled={!result} onClick={submit}>
              {result ? 'Lock in prediction' : 'Preparing the exact answer…'}
            </Button>
            <p className="text-xs text-muted">One answer per day{user ? ', saved to your account.' : ', saved on this device.'}</p>
          </div>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
          <Card>
            <div className="grid gap-4">
              <div className="grid">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Your accuracy</span>
                <span className="font-display text-5xl font-bold tabular">{saved.accuracy.toFixed(1)}%</span>
                <span className="text-sm text-muted">
                  {saved.accuracy === 100
                    ? 'Perfect.'
                    : `You put ${(100 - saved.accuracy).toFixed(1)} percentage points of the pot with the wrong player.`}
                </span>
              </div>
              <div className="grid gap-3">
                {saved.equity.map((eq, i) => (
                  <div key={i} className="grid gap-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="size-2.5 rounded-full" style={{ background: PLAYER_COLORS[i] }} aria-hidden />
                        Player {i + 1}
                      </span>
                      <span className="tabular">
                        Actual <strong>{pct(eq)}</strong> · You said {saved.prediction[i]}%
                      </span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${eq * 100}%`, background: PLAYER_COLORS[i] }} />
                      <div className="absolute top-0 h-full w-0.5 bg-fg" style={{ left: `calc(${saved.prediction[i]}% - 1px)` }} title="Your prediction" />
                    </div>
                    <span className="text-xs text-muted tabular">
                      Wins outright {pct(saved.win[i])} · Splits {pct(saved.tie[i])}
                    </span>
                  </div>
                ))}
                <span className="text-xs text-muted">The thin line marks your prediction. Split pots happen {pct(saved.splitRate)} of the time.</span>
              </div>
            </div>
          </Card>

          <Card title="Why">
            {lines.length ? (
              <ul className="grid list-disc gap-1.5 pl-5 text-sm">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Working out the explanation…</p>
            )}
          </Card>

          <Card title="Explore the run-out">
            <div className="grid gap-3">
              <p className="text-sm text-muted">Deal one random way the board could finish and see who wins it.</p>
              {showdown && (
                <p className="text-sm">
                  <strong>
                    {showdown.winners.length > 1
                      ? `Split pot: ${showdown.winners.map((i) => `Player ${i + 1}`).join(' and ')}.`
                      : `Player ${showdown.winners[0] + 1} wins with ${showdown.bests[showdown.winners[0]].label.full}.`}
                  </strong>{' '}
                  <span className="text-muted">{showdown.reason}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setRunout(shuffled(remainingDeck([...puzzle.hands.flat(), ...puzzle.board])).slice(0, 5 - puzzle.board.length))}
                >
                  {runout ? 'Deal again' : 'Deal the rest'}
                </Button>
                {runout && (
                  <Button size="sm" onClick={() => setRunout(null)}>
                    Back to the puzzle
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <p className="text-center text-sm text-muted">Next puzzle in {formatCountdown(msLeft)} (midnight UTC).</p>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-bold">Your puzzle stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Completed" value={stats.completed} />
          <StatTile label="Current streak" value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`} sub={`Longest: ${stats.longestStreak}`} />
          <StatTile label="Average accuracy" value={stats.averageAccuracy === null ? '—' : `${stats.averageAccuracy.toFixed(1)}%`} />
          <StatTile label="Best prediction" value={stats.best ? `${stats.best.accuracy.toFixed(1)}%` : '—'} sub={stats.best ? formatDate(stats.best.date) : undefined} />
        </div>
        {stats.completed > 0 && (
          <Card title="History">
            <ul className="grid gap-1.5">
              {Object.entries(submissions)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, s]) => (
                  <li key={date} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm odd:bg-surface-2">
                    <span>
                      <span className="font-semibold">{formatDate(date)}</span>
                      <span className="text-muted">
                        {' '}
                        · {KIND_LABEL[s.kind]}, {s.players} players
                      </span>
                    </span>
                    <span className={cx('font-semibold tabular', s.accuracy >= 90 ? 'text-pos' : s.accuracy >= 75 ? 'text-gold' : 'text-muted')}>
                      {s.accuracy.toFixed(1)}%
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}
