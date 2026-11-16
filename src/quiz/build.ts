import { mulberry32 } from '../lib/random'
import { shuffled } from '../poker/cards'
import { PROBABILITY_QUESTIONS, RULE_QUESTIONS, termQuestions } from './bank'
import { probabilityDealQuestion, rankingsQuestion, tiesQuestion, whoWinsQuestion } from './generators'
import type { ChoiceQuestion, Difficulty, Question, QuizCategory } from './types'

export const QUIZ_LENGTH = 5
export type QuizMode = QuizCategory | 'mixed'

const LEVELS: Difficulty[] = ['beginner', 'intermediate', 'advanced']

/** Pick an unused static question, preferring the requested level, then the nearest. */
function fromBank(bank: Question[], difficulty: Difficulty, rng: () => number, used: Set<string>): Question | null {
  const order = [difficulty, ...LEVELS.filter((l) => l !== difficulty)]
  for (const level of order) {
    const pool = bank.filter((q) => q.difficulty === level && !used.has(q.id))
    if (pool.length) return pool[Math.floor(rng() * pool.length)]
  }
  return null
}

/** Shuffle a multiple-choice question's options so the answer isn't always in the same place. */
function shuffleChoices(q: Question, rng: () => number): Question {
  if (q.type !== 'choice') return q
  const order = shuffled(q.choices.map((_, i) => i), rng)
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) } satisfies ChoiceQuestion
}

export function questionFor(category: QuizCategory, difficulty: Difficulty, rng: () => number, used: Set<string>): Question | null {
  switch (category) {
    case 'rankings':
      return rankingsQuestion(difficulty, rng)
    case 'who-wins':
      return whoWinsQuestion(difficulty, rng)
    case 'ties':
      return tiesQuestion(difficulty, rng)
    case 'rules':
      return fromBank(RULE_QUESTIONS, difficulty, rng, used)
    case 'terms':
      return fromBank(termQuestions(difficulty, rng), difficulty, rng, used)
    case 'probability':
      if (difficulty === 'advanced' && rng() < 0.7) return probabilityDealQuestion(rng)
      return fromBank(PROBABILITY_QUESTIONS, difficulty, rng, used)
  }
}

/** Build a quiz. The same seed always builds the same quiz. */
export function buildQuiz(mode: QuizMode, difficulty: Difficulty, seed: number, length = QUIZ_LENGTH): Question[] {
  const rng = mulberry32(seed)
  const categories: QuizCategory[] =
    mode === 'mixed' ? shuffled(['rankings', 'who-wins', 'ties', 'rules', 'terms', 'probability'] as QuizCategory[], rng) : [mode]
  const used = new Set<string>()
  const out: Question[] = []
  for (let i = 0; out.length < length && i < length * 6; i++) {
    const q = questionFor(categories[out.length % categories.length], difficulty, rng, used)
    if (!q || used.has(q.id)) continue
    used.add(q.id)
    out.push(shuffleChoices(q, rng))
  }
  return out
}
