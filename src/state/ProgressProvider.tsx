import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { computeAchievements, type AchievementStatus } from '../achievements/achievements'
import {
  GUEST_KEYS,
  loadPuzzles,
  loadQuizzes,
  loadSeen,
  PROGRESS_RELOAD_EVENT,
  write,
  writeLocalChange,
  type QuizData,
} from '../data/progressStorage'
import { getBrowserStore } from '../data/sessionRepository'
import { LESSONS } from '../learn/lessons'
import { puzzleStats, type Submission } from '../puzzle/scoring'
import { utcDateKey } from '../puzzle/daily'
import { quizStats, type QuizAttempt, type QuizStats } from '../quiz/stats'
import type { Question } from '../quiz/types'
import { useStorageKeys } from './AuthProvider'
import { useLearning } from './LearningProvider'
import { useToast } from './ToastProvider'

/**
 * Shared progress for puzzles and quizzes, so every screen (and the
 * achievements) sees the same data the moment it changes. Saved on this
 * device under the current account's keys (see src/data/progressStorage.ts)
 * and synced by ProgressSync when signed in.
 */
export const PUZZLES_KEY = GUEST_KEYS.puzzles
const MAX_MISSED = 50

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
  const keys = useStorageKeys()
  const [submissions, setSubmissions] = useState(() => loadPuzzles(getBrowserStore(), keys.puzzles))
  const [quizData, setQuizData] = useState<QuizData>(() => loadQuizzes(getBrowserStore(), keys.quizzes))
  const { completed } = useLearning()

  // A sync wrote new progress to storage: show it.
  useEffect(() => {
    const reload = () => {
      setSubmissions(loadPuzzles(getBrowserStore(), keys.puzzles))
      setQuizData(loadQuizzes(getBrowserStore(), keys.quizzes))
    }
    window.addEventListener(PROGRESS_RELOAD_EVENT, reload)
    return () => window.removeEventListener(PROGRESS_RELOAD_EVENT, reload)
  }, [keys])

  const savePuzzle = useCallback(
    (date: string, s: Submission) => {
      setSubmissions((prev) => {
        if (prev[date]) return prev // the first answer counts
        const next = { ...prev, [date]: s }
        writeLocalChange(getBrowserStore(), keys.puzzles, { submissions: next })
        return next
      })
    },
    [keys],
  )

  const recordQuiz = useCallback(
    (attempt: QuizAttempt, questions: Question[]) => {
      setQuizData((prev) => {
        const wrong = new Set(attempt.results.filter((r) => !r.correct).map((r) => r.questionId))
        const right = new Set(attempt.results.filter((r) => r.correct).map((r) => r.questionId))
        const newlyMissed = questions.filter((q) => wrong.has(q.id))
        const missed = [...newlyMissed, ...prev.missed.filter((q) => !right.has(q.id) && !wrong.has(q.id))].slice(0, MAX_MISSED)
        const next: QuizData = { attempts: [...prev.attempts, attempt], missed, missedAt: new Date().toISOString() }
        writeLocalChange(getBrowserStore(), keys.quizzes, next)
        return next
      })
    },
    [keys],
  )

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
      <AchievementWatcher achievements={achievements} storageKey={keys.achievements} />
      {children}
    </ProgressContext.Provider>
  )
}

/** Announces newly unlocked achievements once each. Existing unlocks are recorded silently on first run. */
function AchievementWatcher({ achievements, storageKey }: { achievements: AchievementStatus[]; storageKey: string }) {
  const toast = useToast()

  useEffect(() => {
    const store = getBrowserStore()
    const unlocked = achievements.filter((a) => a.unlocked)
    // Read every time: a sync may have added ones already announced on another device.
    const stored = loadSeen(store, storageKey)
    if (stored === null) {
      // First run: don't announce things earned before achievements existed.
      write(store, storageKey, { seen: unlocked.map((a) => a.id) })
      return
    }
    const seen = new Set(stored)
    const fresh = unlocked.filter((a) => !seen.has(a.id))
    if (!fresh.length) return
    fresh.forEach((a) => toast(`Achievement unlocked: ${a.name}`))
    writeLocalChange(store, storageKey, { seen: [...seen, ...fresh.map((a) => a.id)] })
  }, [achievements, toast, storageKey])

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
