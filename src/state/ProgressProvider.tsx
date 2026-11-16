import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { computeAchievements, type AchievementStatus } from '../achievements/achievements'
import { getBrowserStore } from '../data/sessionRepository'
import { LESSONS } from '../learn/lessons'
import { isIsoDate } from '../lib/dates'
import { puzzleStats, type Submission } from '../puzzle/scoring'
import { utcDateKey } from '../puzzle/daily'
import { quizStats, type QuizAttempt, type QuizStats } from '../quiz/stats'
import type { Question } from '../quiz/types'
import { useLearning } from './LearningProvider'
import { useToast } from './ToastProvider'

/**
 * Shared, device-saved progress for puzzles and quizzes, so every screen (and
 * the achievements) sees the same data the moment it changes.
 *
 * Storage shapes:
 *   river.v1.puzzles      { submissions: { "2026-11-15": Submission } }
 *   river.v1.quizzes      { attempts: QuizAttempt[], missed: Question[] }
 *   river.v1.achievements { seen: string[] }  (ids already announced)
 */
export const PUZZLES_KEY = 'river.v1.puzzles'
export const QUIZZES_KEY = 'river.v1.quizzes'
export const ACHIEVEMENTS_KEY = 'river.v1.achievements'
const MAX_MISSED = 50

function read<T>(key: string, fallback: T): T {
  try {
    const raw = getBrowserStore().getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    getBrowserStore().setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked: progress still works for this visit.
  }
}

function isSubmission(v: unknown): v is Submission {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  const nums = (x: unknown) => Array.isArray(x) && x.every((n) => typeof n === 'number' && Number.isFinite(n))
  return (
    (s.kind === 'preflop' || s.kind === 'flop' || s.kind === 'turn') &&
    typeof s.players === 'number' &&
    nums(s.prediction) &&
    nums(s.equity) &&
    nums(s.win) &&
    nums(s.tie) &&
    typeof s.accuracy === 'number' &&
    typeof s.submittedAt === 'string'
  )
}

function loadPuzzles(): Record<string, Submission> {
  const parsed = read<{ submissions?: Record<string, unknown> }>(PUZZLES_KEY, {})
  const out: Record<string, Submission> = {}
  for (const [date, s] of Object.entries(parsed.submissions ?? {})) if (isIsoDate(date) && isSubmission(s)) out[date] = s
  return out
}

function loadQuizzes(): { attempts: QuizAttempt[]; missed: Question[] } {
  const parsed = read<{ attempts?: unknown; missed?: unknown }>(QUIZZES_KEY, {})
  const attempts = Array.isArray(parsed.attempts)
    ? parsed.attempts.filter((a): a is QuizAttempt => typeof a === 'object' && a !== null && Array.isArray((a as QuizAttempt).results))
    : []
  const missed = Array.isArray(parsed.missed)
    ? parsed.missed.filter((q): q is Question => typeof q === 'object' && q !== null && typeof (q as Question).id === 'string' && typeof (q as Question).type === 'string')
    : []
  return { attempts, missed }
}

interface ProgressValue {
  submissions: Record<string, Submission>
  savePuzzle: (date: string, s: Submission) => void
  attempts: QuizAttempt[]
  missed: Question[]
  quiz: QuizStats
  /** Save a finished quiz; questions answered wrong join the review list, right ones leave it. */
  recordQuiz: (attempt: QuizAttempt, questions: Question[]) => void
  achievements: AchievementStatus[]
}

const ProgressContext = createContext<ProgressValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState(loadPuzzles)
  const [quizData, setQuizData] = useState(loadQuizzes)
  const { completed } = useLearning()

  const savePuzzle = useCallback((date: string, s: Submission) => {
    setSubmissions((prev) => {
      if (prev[date]) return prev // the first answer counts
      const next = { ...prev, [date]: s }
      write(PUZZLES_KEY, { submissions: next })
      return next
    })
  }, [])

  const recordQuiz = useCallback((attempt: QuizAttempt, questions: Question[]) => {
    setQuizData((prev) => {
      const wrong = new Set(attempt.results.filter((r) => !r.correct).map((r) => r.questionId))
      const right = new Set(attempt.results.filter((r) => r.correct).map((r) => r.questionId))
      const newlyMissed = questions.filter((q) => wrong.has(q.id))
      const missed = [...newlyMissed, ...prev.missed.filter((q) => !right.has(q.id) && !wrong.has(q.id))].slice(0, MAX_MISSED)
      const next = { attempts: [...prev.attempts, attempt], missed }
      write(QUIZZES_KEY, next)
      return next
    })
  }, [])

  const quiz = useMemo(() => quizStats(quizData.attempts), [quizData.attempts])
  const achievements = useMemo(() => {
    const p = puzzleStats(submissions, utcDateKey())
    return computeAchievements({
      lessonsCompleted: LESSONS.filter((l) => completed.has(l.id)).length,
      totalLessons: LESSONS.length,
      quizzesCompleted: quiz.completed,
      questionsAnswered: quiz.answered,
      perfectQuizzes: quiz.perfectQuizzes,
      masteredRankings: quiz.masteredRankings,
      categoriesPlayed: quiz.categoriesPlayed,
      puzzlesCompleted: p.completed,
      longestPuzzleStreak: p.longestStreak,
      bestPuzzleAccuracy: p.best?.accuracy ?? null,
    })
  }, [submissions, quiz, completed])

  const value = useMemo(
    () => ({ submissions, savePuzzle, attempts: quizData.attempts, missed: quizData.missed, quiz, recordQuiz, achievements }),
    [submissions, savePuzzle, quizData, quiz, recordQuiz, achievements],
  )
  return (
    <ProgressContext.Provider value={value}>
      <AchievementWatcher achievements={achievements} />
      {children}
    </ProgressContext.Provider>
  )
}

/** Announces newly unlocked achievements once each. Existing unlocks are recorded silently on first run. */
function AchievementWatcher({ achievements }: { achievements: AchievementStatus[] }) {
  const toast = useToast()
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    const unlocked = achievements.filter((a) => a.unlocked)
    if (seen.current === null) {
      const stored = read<{ seen?: string[] } | null>(ACHIEVEMENTS_KEY, null)
      seen.current = new Set(stored?.seen ?? [])
      if (!stored) {
        // First run: don't announce things earned before achievements existed.
        unlocked.forEach((a) => seen.current!.add(a.id))
        write(ACHIEVEMENTS_KEY, { seen: [...seen.current] })
        return
      }
    }
    const fresh = unlocked.filter((a) => !seen.current!.has(a.id))
    if (!fresh.length) return
    fresh.forEach((a) => {
      seen.current!.add(a.id)
      toast(`Achievement unlocked: ${a.name}`)
    })
    write(ACHIEVEMENTS_KEY, { seen: [...seen.current] })
  }, [achievements, toast])

  return null
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider')
  return ctx
}

/** Puzzle answers saved on this device (kept for existing callers). */
export function usePuzzleHistory() {
  const { submissions, savePuzzle } = useProgress()
  return { submissions, save: savePuzzle }
}
