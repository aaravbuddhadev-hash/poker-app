import type { Difficulty, QuizCategory } from './types'

export interface QuizAttempt {
  id: string
  finishedAt: string
  mode: QuizCategory | 'mixed' | 'review'
  difficulty: Difficulty
  results: { questionId: string; category: QuizCategory; correct: boolean }[]
}

export interface QuizStats {
  completed: number
  answered: number
  correct: number
  /** 0..1, or null before any answers. */
  accuracy: number | null
  byCategory: Record<QuizCategory, { answered: number; correct: number }>
  best: { correct: number; total: number } | null
  perfectQuizzes: number
  categoriesPlayed: number
  /** A full-length Advanced hand-rankings quiz with every answer right. */
  masteredRankings: boolean
}

const EMPTY = (): QuizStats['byCategory'] => ({
  rankings: { answered: 0, correct: 0 },
  'who-wins': { answered: 0, correct: 0 },
  ties: { answered: 0, correct: 0 },
  rules: { answered: 0, correct: 0 },
  terms: { answered: 0, correct: 0 },
  probability: { answered: 0, correct: 0 },
})

export function quizStats(attempts: readonly QuizAttempt[], quizLength = 5): QuizStats {
  const byCategory = EMPTY()
  let answered = 0
  let correct = 0
  let best: QuizStats['best'] = null
  let perfect = 0
  let mastered = false
  for (const a of attempts) {
    const right = a.results.filter((r) => r.correct).length
    answered += a.results.length
    correct += right
    for (const r of a.results) {
      byCategory[r.category].answered++
      if (r.correct) byCategory[r.category].correct++
    }
    if (a.results.length && (!best || right / a.results.length > best.correct / best.total)) best = { correct: right, total: a.results.length }
    const isPerfect = a.results.length >= quizLength && right === a.results.length
    if (isPerfect) perfect++
    if (isPerfect && a.mode === 'rankings' && a.difficulty === 'advanced') mastered = true
  }
  return {
    completed: attempts.length,
    answered,
    correct,
    accuracy: answered ? correct / answered : null,
    byCategory,
    best,
    perfectQuizzes: perfect,
    categoriesPlayed: Object.values(byCategory).filter((c) => c.answered > 0).length,
    masteredRankings: mastered,
  }
}
