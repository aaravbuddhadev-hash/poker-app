import { describe, expect, it } from 'vitest'
import { computeAchievements, type AchievementInput } from '../achievements/achievements'
import { mulberry32 } from '../lib/random'
import { fullDeck } from '../poker/cards'
import { bestHand, categoryOf, evaluate, HandCategory } from '../poker/evaluator'
import { PROBABILITY_QUESTIONS, RULE_QUESTIONS, termQuestions } from './bank'
import { buildQuiz, QUIZ_LENGTH } from './build'
import { handOfCategory } from './generators'
import { quizStats, type QuizAttempt } from './stats'
import { CATEGORIES, DIFFICULTIES, isCorrect, type Question } from './types'

/** Independently re-derive the correct answer for engine-generated questions. */
function checkAnswer(q: Question) {
  if (q.type === 'table') {
    const scores = q.hands.map((h) => evaluate([...h, ...q.board]))
    const top = Math.max(...scores)
    const winners = scores.flatMap((s, i) => (s === top ? [i] : []))
    const expected = winners.length > 1 ? q.choices.length - 1 : winners[0]
    expect(q.answer, q.id).toBe(expected)
    expect(new Set([...q.hands.flat(), ...q.board]).size).toBe(q.hands.length * 2 + q.board.length)
  }
  if (q.type === 'cards' && !q.board) {
    const scores = q.options.map(evaluate)
    expect(scores[q.answer], q.id).toBe(Math.max(...scores))
    expect(new Set(scores).size).toBe(scores.length) // no ties between options
  }
  if (q.type === 'cards' && q.board && q.hands) {
    // River card question: the chosen card must flip the result, the others must not.
    const now = q.hands.map((h) => evaluate([...h, ...q.board!]))
    const leader = now[0] > now[1] ? 0 : 1
    const flips = q.options.map(([c]) => {
      const s = q.hands!.map((h) => evaluate([...h, ...q.board!, c]))
      return s[1 - leader] > s[leader]
    })
    expect(flips.filter(Boolean).length, q.id).toBe(1)
    expect(flips[q.answer]).toBe(true)
  }
  if (q.type === 'choice') {
    expect(q.answer).toBeGreaterThanOrEqual(0)
    expect(q.answer).toBeLessThan(q.choices.length)
    expect(new Set(q.choices).size, q.id).toBe(q.choices.length)
  }
  if (q.type === 'number') {
    expect(q.answer).toBeGreaterThanOrEqual(q.min)
    expect(q.answer).toBeLessThanOrEqual(q.max)
  }
}

describe('quiz generation', () => {
  it('builds hands of every category correctly', () => {
    const rng = mulberry32(1)
    for (let cat = 0; cat <= 8; cat++)
      for (let i = 0; i < 30; i++) {
        const h = handOfCategory(cat as HandCategory, rng)
        expect(new Set(h).size).toBe(5)
        expect(categoryOf(evaluate(h))).toBe(cat)
      }
  })

  it('builds 5-question quizzes for every category and level, with verified answers', () => {
    for (const mode of [...CATEGORIES.map((c) => c.id), 'mixed' as const])
      for (const { id: level } of DIFFICULTIES)
        for (let seed = 1; seed <= 6; seed++) {
          const quiz = buildQuiz(mode, level, seed)
          expect(quiz, `${mode}/${level}/${seed}`).toHaveLength(QUIZ_LENGTH)
          expect(new Set(quiz.map((q) => q.id)).size).toBe(QUIZ_LENGTH)
          if (mode !== 'mixed') expect(quiz.every((q) => q.category === mode)).toBe(true)
          quiz.forEach(checkAnswer)
        }
  })

  it('is reproducible from its seed', () => {
    expect(buildQuiz('mixed', 'intermediate', 42)).toEqual(buildQuiz('mixed', 'intermediate', 42))
  })

  it('mixed quizzes cover different categories', () => {
    const cats = new Set(buildQuiz('mixed', 'beginner', 7).map((q) => q.category))
    expect(cats.size).toBe(QUIZ_LENGTH)
  })

  it('scores choice and number answers', () => {
    const quiz = buildQuiz('probability', 'intermediate', 3)
    for (const q of quiz) {
      if (q.type === 'number') {
        expect(isCorrect(q, { kind: 'number', value: q.answer + q.tolerance })).toBe(true)
        expect(isCorrect(q, { kind: 'number', value: q.answer + q.tolerance + 0.5 })).toBe(false)
      } else {
        expect(isCorrect(q, { kind: 'index', value: q.answer })).toBe(true)
        expect(isCorrect(q, { kind: 'index', value: (q.answer + 1) % 4 })).toBe(false)
      }
    }
  })
})

describe('question banks', () => {
  it('rule questions are well-formed with unique ids', () => {
    expect(new Set(RULE_QUESTIONS.map((q) => q.id)).size).toBe(RULE_QUESTIONS.length)
    RULE_QUESTIONS.forEach(checkAnswer)
    for (const d of ['beginner', 'intermediate', 'advanced']) expect(RULE_QUESTIONS.filter((q) => q.difficulty === d).length).toBeGreaterThanOrEqual(5)
  })

  it('probability answers match exact math', () => {
    const flush = PROBABILITY_QUESTIONS.find((q) => q.id === 'probability:flush-river')!
    expect(flush.type === 'number' && flush.answer).toBe(35)
    const turn = PROBABILITY_QUESTIONS.find((q) => q.id === 'probability:flush-turn')!
    expect(turn.type === 'number' && turn.answer).toBe(19.6)
  })

  it('terminology questions never contain their own answer in the prompt', () => {
    for (const d of ['beginner', 'intermediate', 'advanced'] as const)
      for (const q of termQuestions(d, mulberry32(9))) {
        expect(q.prompt.toLowerCase()).not.toContain(q.choices[q.answer].toLowerCase())
        checkAnswer(q)
      }
  })

  it('a random 7-card deal still evaluates (sanity)', () => {
    expect(bestHand(fullDeck().slice(0, 7)).cards).toHaveLength(5)
  })
})

describe('quiz stats', () => {
  const attempt = (mode: QuizAttempt['mode'], difficulty: QuizAttempt['difficulty'], correct: boolean[]): QuizAttempt => ({
    id: `${mode}-${difficulty}`,
    finishedAt: 'x',
    mode,
    difficulty,
    results: correct.map((c, i) => ({ questionId: `q${i}`, category: mode === 'mixed' || mode === 'review' ? 'rules' : mode, correct: c })),
  })

  it('totals answers, accuracy, best score and mastery', () => {
    const s = quizStats([
      attempt('rules', 'beginner', [true, true, false, true, false]),
      attempt('rankings', 'advanced', [true, true, true, true, true]),
    ])
    expect(s.completed).toBe(2)
    expect(s.answered).toBe(10)
    expect(s.accuracy).toBe(0.8)
    expect(s.best).toEqual({ correct: 5, total: 5 })
    expect(s.perfectQuizzes).toBe(1)
    expect(s.masteredRankings).toBe(true)
    expect(s.byCategory.rules).toEqual({ answered: 5, correct: 3 })
    expect(s.categoriesPlayed).toBe(2)
    expect(quizStats([]).accuracy).toBeNull()
  })
})

describe('achievements', () => {
  const base: AchievementInput = {
    lessonsCompleted: 0,
    totalLessons: 9,
    quizzesCompleted: 0,
    questionsAnswered: 0,
    perfectQuizzes: 0,
    masteredRankings: false,
    categoriesPlayed: 0,
    puzzlesCompleted: 0,
    longestPuzzleStreak: 0,
    bestPuzzleAccuracy: null,
  }
  const unlocked = (i: AchievementInput) => computeAchievements(i).filter((a) => a.unlocked).map((a) => a.id)

  it('starts with nothing unlocked', () => expect(unlocked(base)).toEqual([]))

  it('unlocks at the right thresholds and caps progress', () => {
    const got = unlocked({
      ...base,
      lessonsCompleted: 9,
      quizzesCompleted: 3,
      questionsAnswered: 50,
      perfectQuizzes: 1,
      categoriesPlayed: 6,
      puzzlesCompleted: 5,
      longestPuzzleStreak: 7,
      bestPuzzleAccuracy: 95,
    })
    expect(got.sort()).toEqual(['fifty-questions', 'first-lesson', 'first-quiz', 'five-puzzles', 'flawless', 'puzzle-week', 'rules-graduate', 'sharp-eye', 'well-rounded'])
    const q = computeAchievements({ ...base, questionsAnswered: 73 }).find((a) => a.id === 'fifty-questions')!
    expect(q.current).toBe(50)
    expect(unlocked({ ...base, lessonsCompleted: 8 })).toEqual(['first-lesson'])
    expect(unlocked({ ...base, bestPuzzleAccuracy: 94.9 })).toEqual([])
  })
})
