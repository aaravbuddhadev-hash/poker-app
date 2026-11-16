import { isIsoDate } from '../lib/dates'
import type { Submission } from '../puzzle/scoring'
import type { QuizAttempt } from '../quiz/stats'
import type { Question } from '../quiz/types'
import type { KeyValueStore } from './sessionRepository'

/**
 * Where learning progress is kept on this device, and how it's read back.
 *
 * Guest data uses the original keys. A signed-in account gets its own keys
 * (`river.v1.u.<user id>.*`), so two people sharing a browser never see each
 * other's records, and guest data is never mixed into an account by accident.
 *
 * Shapes:
 *   learning      { completed: string[], changed?: { [lessonId]: ISO time } }
 *   puzzles       { submissions: { "2026-11-15": Submission } }
 *   quizzes       { attempts: QuizAttempt[], missed: Question[], missedAt?: ISO time }
 *   achievements  { seen: string[] }  (ids already announced)
 */
export interface StorageKeys {
  sessions: string
  learning: string
  puzzles: string
  quizzes: string
  achievements: string
}

export const GUEST_KEYS: StorageKeys = {
  sessions: 'river.v1.sessions',
  learning: 'river.v1.learning',
  puzzles: 'river.v1.puzzles',
  quizzes: 'river.v1.quizzes',
  achievements: 'river.v1.achievements',
}

export function storageKeys(userId: string | null): StorageKeys {
  if (!userId) return GUEST_KEYS
  const p = `river.v1.u.${userId}.`
  return {
    sessions: `${p}sessions`,
    learning: `${p}learning`,
    puzzles: `${p}puzzles`,
    quizzes: `${p}quizzes`,
    achievements: `${p}achievements`,
  }
}

/** Every key belonging to one signed-in account, for removing it from a device on sign-out. */
export function accountKeyPrefix(userId: string) {
  return `river.v1.u.${userId}.`
}

function read(store: KeyValueStore, key: string): Record<string, unknown> {
  try {
    const raw = store.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function write(store: KeyValueStore, key: string, value: unknown) {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked or full: progress still works for this visit.
  }
}

/** Save a change the user made on this device, and let the sync know. */
export function writeLocalChange(store: KeyValueStore, key: string, value: unknown) {
  write(store, key, value)
  // Deferred: this can run inside a React state update, where other components mustn't update.
  if (typeof window !== 'undefined') queueMicrotask(() => window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT)))
}

const isString = (x: unknown): x is string => typeof x === 'string'

// ---- Lessons ---------------------------------------------------------------

export interface LearningData {
  completed: string[]
  /** When each lesson was last marked done or not done, so devices can agree on the latest. */
  changed: Record<string, string>
}

export function loadLearning(store: KeyValueStore, key: string): LearningData {
  const p = read(store, key)
  const completed = Array.isArray(p.completed) ? [...new Set(p.completed.filter(isString))] : []
  const changed: Record<string, string> = {}
  if (typeof p.changed === 'object' && p.changed !== null) {
    for (const [id, at] of Object.entries(p.changed)) if (isString(at)) changed[id] = at
  }
  return { completed, changed }
}

// ---- Puzzles ---------------------------------------------------------------

export function isSubmission(v: unknown): v is Submission {
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

export function parseSubmissions(v: unknown): Record<string, Submission> {
  const out: Record<string, Submission> = {}
  if (typeof v !== 'object' || v === null) return out
  for (const [date, s] of Object.entries(v)) if (isIsoDate(date) && isSubmission(s)) out[date] = s
  return out
}

export function loadPuzzles(store: KeyValueStore, key: string): Record<string, Submission> {
  return parseSubmissions(read(store, key).submissions)
}

// ---- Quizzes ---------------------------------------------------------------

export interface QuizData {
  attempts: QuizAttempt[]
  missed: Question[]
  /** When the review list last changed. */
  missedAt?: string
}

export function parseAttempts(v: unknown): QuizAttempt[] {
  return Array.isArray(v)
    ? v.filter(
        (a): a is QuizAttempt =>
          typeof a === 'object' && a !== null && isString((a as QuizAttempt).id) && isString((a as QuizAttempt).finishedAt) && Array.isArray((a as QuizAttempt).results),
      )
    : []
}

export function parseQuestions(v: unknown): Question[] {
  return Array.isArray(v)
    ? v.filter((q): q is Question => typeof q === 'object' && q !== null && isString((q as Question).id) && isString((q as Question).type))
    : []
}

export function loadQuizzes(store: KeyValueStore, key: string): QuizData {
  const p = read(store, key)
  const data: QuizData = { attempts: parseAttempts(p.attempts), missed: parseQuestions(p.missed) }
  if (isString(p.missedAt)) data.missedAt = p.missedAt
  return data
}

// ---- Achievements ----------------------------------------------------------

/** Ids already announced, or null if this device/account has never recorded any. */
export function loadSeen(store: KeyValueStore, key: string): string[] | null {
  const p = read(store, key)
  return Array.isArray(p.seen) ? p.seen.filter(isString) : null
}

/** Fired on `window` after a sync writes new progress to device storage, so screens reload it. */
export const PROGRESS_RELOAD_EVENT = 'river:progress-reload'
/** Fired on `window` after the user changes progress on this device, so it gets uploaded. */
export const PROGRESS_CHANGED_EVENT = 'river:progress-changed'
