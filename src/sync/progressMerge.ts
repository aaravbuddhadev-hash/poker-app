import {
  loadLearning,
  loadPuzzles,
  loadQuizzes,
  loadSeen,
  parseAttempts,
  parseQuestions,
  parseSubmissions,
  write,
  type StorageKeys,
} from '../data/progressStorage'
import type { KeyValueStore } from '../data/sessionRepository'
import type { Submission } from '../puzzle/scoring'
import type { QuizAttempt } from '../quiz/stats'
import type { Question } from '../quiz/types'

/**
 * A user's learning progress as one document, stored in the `progress` table.
 *
 * Every device may have changed it since they last spoke, so documents are
 * merged rather than overwritten, with rules that give the same answer no
 * matter which device merges first:
 *   - lessons: the latest "done" / "not done" change per lesson wins
 *   - daily puzzles: the first answer for each day counts (as in the app)
 *   - quiz attempts: every attempt from every device is kept
 *   - review list: the most recently changed list wins
 *   - announced achievements: everything announced anywhere
 */
export interface ProgressDoc {
  v: 1
  lessons: Record<string, { done: boolean; at: string }>
  puzzles: Record<string, Submission>
  quizAttempts: QuizAttempt[]
  missed: { questions: Question[]; at: string }
  seen: string[]
}

const EPOCH = '1970-01-01T00:00:00.000Z'

export const emptyProgress = (): ProgressDoc => ({ v: 1, lessons: {}, puzzles: {}, quizAttempts: [], missed: { questions: [], at: EPOCH }, seen: [] })

export function mergeProgress(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  const lessons: ProgressDoc['lessons'] = { ...a.lessons }
  for (const [id, l] of Object.entries(b.lessons)) {
    const mine = lessons[id]
    // Later change wins; on an exact tie, "done" wins so the result doesn't depend on order.
    if (!mine || l.at > mine.at || (l.at === mine.at && l.done)) lessons[id] = l
  }

  const puzzles: ProgressDoc['puzzles'] = { ...a.puzzles }
  for (const [date, s] of Object.entries(b.puzzles)) {
    const mine = puzzles[date]
    if (!mine || s.submittedAt < mine.submittedAt || (s.submittedAt === mine.submittedAt && s.accuracy > mine.accuracy)) puzzles[date] = s
  }

  const byId = new Map<string, QuizAttempt>()
  for (const q of [...a.quizAttempts, ...b.quizAttempts]) if (!byId.has(q.id)) byId.set(q.id, q)
  const quizAttempts = [...byId.values()].sort((x, y) => x.finishedAt.localeCompare(y.finishedAt) || x.id.localeCompare(y.id))

  const missed =
    b.missed.at > a.missed.at || (b.missed.at === a.missed.at && JSON.stringify(b.missed.questions) > JSON.stringify(a.missed.questions)) ? b.missed : a.missed

  const seen = [...new Set([...a.seen, ...b.seen])].sort()

  return { v: 1, lessons: sortKeys(lessons), puzzles: sortKeys(puzzles), quizAttempts, missed, seen }
}

function sortKeys<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(o).sort(([x], [y]) => x.localeCompare(y)))
}

/** True when two documents hold the same progress (they're kept in a canonical order). */
export function sameProgress(a: ProgressDoc, b: ProgressDoc): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Validate a document downloaded from the cloud; anything malformed is dropped. */
export function parseProgressDoc(v: unknown): ProgressDoc {
  const doc = emptyProgress()
  if (typeof v !== 'object' || v === null) return doc
  const p = v as Record<string, unknown>
  if (typeof p.lessons === 'object' && p.lessons !== null) {
    for (const [id, l] of Object.entries(p.lessons)) {
      const x = l as { done?: unknown; at?: unknown }
      if (typeof x === 'object' && x !== null && typeof x.done === 'boolean' && typeof x.at === 'string') doc.lessons[id] = { done: x.done, at: x.at }
    }
  }
  doc.puzzles = parseSubmissions(p.puzzles)
  doc.quizAttempts = parseAttempts(p.quizAttempts)
  const m = p.missed as { questions?: unknown; at?: unknown } | undefined
  if (typeof m === 'object' && m !== null && typeof m.at === 'string') doc.missed = { questions: parseQuestions(m.questions), at: m.at }
  if (Array.isArray(p.seen)) doc.seen = p.seen.filter((x): x is string => typeof x === 'string')
  // Normalize ordering so comparisons are stable.
  return mergeProgress(doc, emptyProgress())
}

/** Build the document from what's saved on this device. */
export function readLocalProgress(store: KeyValueStore, keys: StorageKeys): ProgressDoc {
  const learning = loadLearning(store, keys.learning)
  const lessons: ProgressDoc['lessons'] = {}
  for (const [id, at] of Object.entries(learning.changed)) lessons[id] = { done: false, at }
  for (const id of learning.completed) lessons[id] = { done: true, at: learning.changed[id] ?? EPOCH }
  const quizzes = loadQuizzes(store, keys.quizzes)
  const doc: ProgressDoc = {
    v: 1,
    lessons,
    puzzles: loadPuzzles(store, keys.puzzles),
    quizAttempts: quizzes.attempts,
    missed: { questions: quizzes.missed, at: quizzes.missedAt ?? EPOCH },
    seen: loadSeen(store, keys.achievements) ?? [],
  }
  return mergeProgress(doc, emptyProgress())
}

/** Save a document as this device's progress. */
export function writeLocalProgress(store: KeyValueStore, keys: StorageKeys, doc: ProgressDoc) {
  const lessons = Object.entries(doc.lessons)
  write(store, keys.learning, {
    completed: lessons.filter(([, l]) => l.done).map(([id]) => id),
    changed: Object.fromEntries(lessons.filter(([, l]) => l.at !== EPOCH).map(([id, l]) => [id, l.at])),
  })
  write(store, keys.puzzles, { submissions: doc.puzzles })
  write(store, keys.quizzes, { attempts: doc.quizAttempts, missed: doc.missed.questions, missedAt: doc.missed.at })
  // An empty list would tell the achievement watcher "nothing announced yet", so it
  // would announce every badge already earned. With nothing to record, leave it alone.
  if (doc.seen.length > 0 || loadSeen(store, keys.achievements) !== null) write(store, keys.achievements, { seen: doc.seen })
}
