import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckIcon, CloseIcon } from '../../components/icons'
import { QuestionView } from '../../components/quiz/QuestionView'
import { Button, cx } from '../../components/ui'
import { buildQuiz, QUIZ_LENGTH, type QuizMode } from '../../quiz/build'
import { CATEGORIES, DIFFICULTIES, isCorrect, type Difficulty, type Question, type Response } from '../../quiz/types'
import { useProgress } from '../../state/ProgressProvider'

const MODES = new Set<string>(['mixed', ...CATEGORIES.map((c) => c.id)])

export function QuizPlayPage() {
  const [params] = useSearchParams()
  const rawMode = params.get('mode') ?? 'mixed'
  const review = rawMode === 'review'
  const mode = (MODES.has(rawMode) ? rawMode : 'mixed') as QuizMode
  const level = (DIFFICULTIES.some((d) => d.id === params.get('level')) ? params.get('level') : 'beginner') as Difficulty
  const [round, setRound] = useState(0)
  // A new key per round rebuilds the quiz with a fresh seed.
  return <QuizRound key={`${rawMode}-${level}-${round}`} review={review} mode={mode} level={level} onAgain={() => setRound((r) => r + 1)} />
}

function QuizRound({ review, mode, level, onAgain }: { review: boolean; mode: QuizMode; level: Difficulty; onAgain: () => void }) {
  const { missed, recordQuiz } = useProgress()
  const [questions] = useState<Question[]>(() => (review ? missed.slice(0, QUIZ_LENGTH) : buildQuiz(mode, level, Math.floor(Math.random() * 2 ** 31))))
  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState<(Response | null)[]>(() => questions.map(() => null))
  const [finished, setFinished] = useState(false)

  const title = review ? 'Review missed questions' : mode === 'mixed' ? 'Quick quiz' : CATEGORIES.find((c) => c.id === mode)!.name
  const levelName = DIFFICULTIES.find((d) => d.id === level)!.name

  if (questions.length === 0) {
    return (
      <div className="grid gap-4">
        <Link to="/learn/quizzes" className="text-sm font-semibold text-emerald hover:underline">
          ← Quizzes
        </Link>
        <p className="rounded-2xl border border-line bg-surface p-5">Nothing to review: you haven’t missed any questions yet.</p>
      </div>
    )
  }

  const q = questions[index]
  const correctCount = responses.filter((r, i) => r && isCorrect(questions[i], r)).length

  function submit(r: Response) {
    setResponses((rs) => rs.map((x, i) => (i === index ? r : x)))
  }

  function next() {
    if (index < questions.length - 1) {
      setIndex(index + 1)
      window.scrollTo({ top: 0 })
      return
    }
    recordQuiz(
      {
        id: `${Date.now().toString(36)}`,
        finishedAt: new Date().toISOString(),
        mode: review ? 'review' : mode,
        difficulty: level,
        results: questions.map((qq, i) => ({ questionId: qq.id, category: qq.category, correct: !!responses[i] && isCorrect(qq, responses[i]!) })),
      },
      questions,
    )
    setFinished(true)
    window.scrollTo({ top: 0 })
  }

  if (finished) {
    const perfect = correctCount === questions.length
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid w-full max-w-2xl gap-5">
        <Link to="/learn/quizzes" className="text-sm font-semibold text-emerald hover:underline">
          ← Quizzes
        </Link>
        <section className="grid justify-items-center gap-2 rounded-3xl border border-line felt-glow p-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{title}</span>
          <span className="font-display text-6xl font-bold tabular">
            {correctCount}/{questions.length}
          </span>
          <span className="text-muted">{perfect ? 'Perfect round.' : correctCount >= questions.length - 1 ? 'Nearly perfect.' : 'Missed questions are saved for review.'}</span>
        </section>
        <ol className="grid gap-2">
          {questions.map((qq, i) => {
            const ok = !!responses[i] && isCorrect(qq, responses[i]!)
            return (
              <li key={qq.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3">
                <span className={cx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', ok ? 'bg-pos/20 text-pos' : 'bg-neg/20 text-neg')}>
                  {ok ? <CheckIcon width={14} height={14} strokeWidth={3} /> : <CloseIcon width={14} height={14} strokeWidth={3} />}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-sm font-semibold">{qq.prompt}</span>
                  <span className="text-xs text-muted">{CATEGORIES.find((c) => c.id === qq.category)!.name}</span>
                </span>
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          {!review && (
            <Button variant="primary" onClick={onAgain}>
              New {title.toLowerCase()}
            </Button>
          )}
          <Link to="/learn/quizzes" className="inline-flex h-11 items-center rounded-full border border-line bg-surface-2 px-5 text-sm font-semibold">
            Back to quizzes
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/learn/quizzes" className="text-sm font-semibold text-emerald hover:underline">
          ← Quizzes
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          {title}
          {!review && ` · ${levelName}`}
        </span>
      </div>
      <div className="flex gap-1.5" aria-label={`Question ${index + 1} of ${questions.length}`}>
        {questions.map((qq, i) => {
          const r = responses[i]
          return (
            <span
              key={qq.id}
              className={cx('h-1.5 flex-1 rounded-full', r ? (isCorrect(qq, r) ? 'bg-pos' : 'bg-neg') : i === index ? 'bg-emerald' : 'bg-surface-2')}
            />
          )
        })}
      </div>
      <span className="text-sm text-muted">
        Question {index + 1} of {questions.length}
      </span>
      <motion.div key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
        <QuestionView question={q} submitted={responses[index]} onSubmit={submit} />
      </motion.div>
      {responses[index] && (
        <Button variant="primary" className="justify-self-start" onClick={next}>
          {index < questions.length - 1 ? 'Next question' : 'See results'}
        </Button>
      )}
    </div>
  )
}
