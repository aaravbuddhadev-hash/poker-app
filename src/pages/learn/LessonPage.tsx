import { motion } from 'motion/react'
import { Link, Navigate, useParams } from 'react-router'
import { CheckIcon } from '../../components/icons'
import { Button } from '../../components/ui'
import { LESSONS, lessonById } from '../../learn/lessons'
import { useLearning } from '../../state/LearningProvider'
import { useToast } from '../../state/ToastProvider'

// Typography for lesson content, so lesson files stay plain JSX.
const PROSE =
  'grid gap-4 leading-relaxed [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-1.5 [&_ol]:pl-5 [&_strong]:text-fg'

export function LessonPage() {
  const { lessonId } = useParams()
  const lesson = lessonById(lessonId)
  const { completed, setComplete } = useLearning()
  const toast = useToast()
  if (!lesson) return <Navigate to="/learn/rules" replace />

  const index = LESSONS.indexOf(lesson)
  const prev = LESSONS[index - 1]
  const next = LESSONS[index + 1]
  const isDone = completed.has(lesson.id)
  const { Content } = lesson

  return (
    <motion.article key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-2">
        <Link to="/learn/rules" className="text-sm font-semibold text-emerald hover:underline">
          ← Rules guide
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          Lesson {index + 1} of {LESSONS.length} · {lesson.minutes} min
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{lesson.title}</h1>
        <p className="text-muted">{lesson.summary}</p>
      </div>

      <div className={PROSE}>
        <Content />
      </div>

      <div className="grid gap-4 border-t border-line pt-6">
        {isDone ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
            <span className="flex items-center gap-2 font-semibold text-emerald">
              <CheckIcon width={18} height={18} strokeWidth={3} /> Lesson complete
            </span>
            <button type="button" className="text-xs text-muted underline underline-offset-2 hover:text-fg" onClick={() => setComplete(lesson.id, false)}>
              Mark as not complete
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            className="justify-self-start"
            onClick={() => {
              setComplete(lesson.id, true)
              toast(next ? 'Lesson complete' : 'Rules guide complete')
            }}
          >
            <CheckIcon width={18} height={18} strokeWidth={3} /> Mark lesson complete
          </Button>
        )}
        <nav className="flex justify-between gap-3 text-sm font-semibold" aria-label="Lessons">
          {prev ? (
            <Link to={`/learn/rules/${prev.id}`} className="text-muted hover:text-fg">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/learn/rules/${next.id}`} className="text-right text-emerald hover:underline">
              Next: {next.title} →
            </Link>
          ) : (
            <Link to="/learn/glossary" className="text-right text-emerald hover:underline">
              Browse the glossary →
            </Link>
          )}
        </nav>
      </div>
    </motion.article>
  )
}
