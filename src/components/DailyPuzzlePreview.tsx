import { useMemo } from 'react'
import { Link } from 'react-router'
import { KIND_LABEL, puzzleForDate, utcDateKey } from '../puzzle/daily'
import { puzzleStats } from '../puzzle/scoring'
import { usePuzzleHistory } from '../state/usePuzzleHistory'
import { PlayingCard } from './PlayingCard'
import { Card } from './ui'

/** Home dashboard card: today's real puzzle, and whether it's solved. */
export function DailyPuzzlePreview() {
  const today = utcDateKey()
  const puzzle = useMemo(() => puzzleForDate(today), [today])
  const { submissions } = usePuzzleHistory()
  const saved = submissions[today]
  const stats = puzzleStats(submissions, today)

  return (
    <Card
      title="Daily puzzle"
      action={
        <span className="text-xs text-muted">
          Streak <strong className="text-gold tabular">{stats.currentStreak}</strong>
        </span>
      }
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="Today's hands">
          {puzzle.hands.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-xs font-semibold text-muted">vs</span>}
              <div className="flex gap-1">
                {h.map((c) => (
                  <PlayingCard key={c} card={c} size="xs" flip={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          #{puzzle.number} · {KIND_LABEL[puzzle.kind]}, {puzzle.hands.length} players.{' '}
          {saved ? (
            <>
              You solved it with <strong className="text-fg">{saved.accuracy.toFixed(1)}%</strong> accuracy.
            </>
          ) : (
            'Guess each player’s share of the pot, then see the exact answer.'
          )}
        </p>
        <Link to="/puzzle" className="text-sm font-semibold text-emerald hover:underline">
          {saved ? 'See today’s answer →' : 'Solve today’s puzzle →'}
        </Link>
      </div>
    </Card>
  )
}
