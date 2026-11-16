import type { Card } from '../poker/cards'

export type QuizCategory = 'rankings' | 'who-wins' | 'rules' | 'terms' | 'probability' | 'ties'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export const CATEGORIES: { id: QuizCategory; name: string; blurb: string }[] = [
  { id: 'rankings', name: 'Hand rankings', blurb: 'Spot the strongest hand.' },
  { id: 'who-wins', name: 'Who wins?', blurb: 'Read the board and pick the winner.' },
  { id: 'ties', name: 'Tie-breakers', blurb: 'Kickers, split pots and close calls.' },
  { id: 'rules', name: 'Rules', blurb: 'Blinds, betting rounds and showdowns.' },
  { id: 'terms', name: 'Terminology', blurb: 'Talk like a player.' },
  { id: 'probability', name: 'Probability', blurb: 'Outs, odds and equity.' },
]

export const DIFFICULTIES: { id: Difficulty; name: string }[] = [
  { id: 'beginner', name: 'Beginner' },
  { id: 'intermediate', name: 'Intermediate' },
  { id: 'advanced', name: 'Advanced' },
]

interface Base {
  /** Stable id built from the question's content, used for the missed-questions list. */
  id: string
  category: QuizCategory
  difficulty: Difficulty
  prompt: string
  explanation: string
  /** Cards to highlight when the answer is shown. */
  highlight?: Card[]
}

/** Multiple choice, optionally showing a set of cards above the choices. */
export interface ChoiceQuestion extends Base {
  type: 'choice'
  cards?: Card[]
  choices: string[]
  answer: number
}

/** A dealt table (hole cards + board); choose a player or "Split pot". */
export interface TableQuestion extends Base {
  type: 'table'
  hands: Card[][]
  board: Card[]
  choices: string[]
  answer: number
}

/** Pick one of several card groups, e.g. "Which hand is strongest?" or "Which river card…?". */
export interface CardsQuestion extends Base {
  type: 'cards'
  /** Optional dealt table shown above the options. */
  hands?: Card[][]
  board?: Card[]
  options: Card[][]
  answer: number
}

/** Numeric answer, correct within `tolerance`. */
export interface NumberQuestion extends Base {
  type: 'number'
  hands?: Card[][]
  board?: Card[]
  unit: '%' | 'cards'
  min: number
  max: number
  answer: number
  tolerance: number
}

export type Question = ChoiceQuestion | TableQuestion | CardsQuestion | NumberQuestion

/** What the player submitted: a choice index or a number. */
export type Response = { kind: 'index'; value: number } | { kind: 'number'; value: number }

export function isCorrect(q: Question, r: Response): boolean {
  if (q.type === 'number') return r.kind === 'number' && Math.abs(r.value - q.answer) <= q.tolerance
  return r.kind === 'index' && r.value === q.answer
}

/** Human-readable correct answer for the feedback panel. */
export function answerText(q: Question): string {
  switch (q.type) {
    case 'choice':
    case 'table':
      return q.choices[q.answer]
    case 'cards':
      return `Option ${String.fromCharCode(65 + q.answer)}`
    case 'number':
      return q.unit === '%'
        ? `${q.answer.toFixed(1)}%${q.tolerance ? ` (anything within ${q.tolerance} points counts)` : ''}`
        : `${q.answer} ${q.answer === 1 ? 'card' : 'cards'}`
  }
}
