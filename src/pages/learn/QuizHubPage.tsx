import { useState } from 'react'
import { Link } from 'react-router'
import { Card, PageHeader, Segmented, StatTile } from '../../components/ui'
import { CATEGORIES, DIFFICULTIES, type Difficulty } from '../../quiz/types'
import { useProgress } from '../../state/ProgressProvider'

export function QuizHubPage() {
  const { quiz, missed } = useProgress()
  const [level, setLevel] = useState<Difficulty>('beginner')
  const pct = (c: number, a: number) => `${Math.round((c / a) * 100)}%`

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link to="/learn" className="text-sm font-semibold text-emerald hover:underline">
          ← Learn
        </Link>
        <PageHeader title="Quizzes" subtitle="Five questions at a time. Hands are dealt fresh every time, and the poker engine checks every answer." />
      </div>

      <section className="grid gap-4 rounded-2xl border border-line felt-glow p-5 md:p-6">
        <div className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Quick quiz</span>
          <h2 className="font-display text-2xl font-bold">Five questions, every category</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Difficulty" options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.name }))} value={level} onChange={setLevel} />
          <Link to={`/learn/quizzes/play?mode=mixed&level=${level}`} className="inline-flex h-11 items-center rounded-full bg-emerald px-5 text-sm font-semibold text-on-accent hover:brightness-110">
            Start quick quiz
          </Link>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold">By category</h2>
          <span className="text-xs text-muted">Difficulty: {DIFFICULTIES.find((d) => d.id === level)!.name}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const s = quiz.byCategory[c.id]
            return (
              <Link key={c.id} to={`/learn/quizzes/play?mode=${c.id}&level=${level}`} className="grid gap-1 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-emerald/60">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-muted">{c.blurb}</span>
                <span className="mt-1 text-xs text-muted">{s.answered ? `${s.correct} of ${s.answered} right (${pct(s.correct, s.answered)})` : 'Not tried yet'}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {missed.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid">
              <span className="font-semibold">Review missed questions</span>
              <span className="text-sm text-muted">
                {missed.length} question{missed.length === 1 ? '' : 's'} to retry. Get one right and it leaves the list.
              </span>
            </div>
            <Link to="/learn/quizzes/play?mode=review" className="inline-flex h-10 items-center rounded-full border border-line bg-surface-2 px-4 text-sm font-semibold hover:border-emerald/60">
              Review now
            </Link>
          </div>
        </Card>
      )}

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-bold">Your progress</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Quizzes completed" value={quiz.completed} />
          <StatTile label="Questions answered" value={quiz.answered} />
          <StatTile label="Overall accuracy" value={quiz.accuracy === null ? '—' : `${Math.round(quiz.accuracy * 100)}%`} />
          <StatTile label="Best score" value={quiz.best ? `${quiz.best.correct}/${quiz.best.total}` : '—'} sub={quiz.perfectQuizzes ? `${quiz.perfectQuizzes} perfect` : undefined} />
        </div>
      </section>
    </div>
  )
}
