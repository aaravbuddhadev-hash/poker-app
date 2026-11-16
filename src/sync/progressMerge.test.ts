import { describe, expect, it } from 'vitest'
import { storageKeys } from '../data/progressStorage'
import { createMemoryStore } from '../data/sessionRepository'
import type { Submission } from '../puzzle/scoring'
import type { QuizAttempt } from '../quiz/stats'
import { emptyProgress, mergeProgress, parseProgressDoc, readLocalProgress, sameProgress, writeLocalProgress, type ProgressDoc } from './progressMerge'
import { syncProgress } from './progressSync'

const sub = (submittedAt: string, accuracy = 80): Submission => ({
  kind: 'flop',
  players: 2,
  prediction: [60, 40],
  equity: [0.6, 0.4],
  win: [0.6, 0.4],
  tie: [0, 0],
  splitRate: 0,
  accuracy,
  submittedAt,
})
const attempt = (id: string, finishedAt: string): QuizAttempt => ({
  id,
  finishedAt,
  mode: 'rankings',
  difficulty: 'beginner',
  results: [{ questionId: `q-${id}`, category: 'rankings', correct: true }],
})
const doc = (patch: Partial<ProgressDoc>): ProgressDoc => ({ ...emptyProgress(), ...patch })

describe('mergeProgress', () => {
  const a = doc({
    lessons: { deck: { done: true, at: '2026-11-10T00:00:00Z' }, blinds: { done: true, at: '2026-11-10T00:00:00Z' } },
    puzzles: { '2026-11-15': sub('2026-11-15T09:00:00Z', 70) },
    quizAttempts: [attempt('q1', '2026-11-10T00:00:00Z')],
    missed: { questions: [{ id: 'm1', type: 'choice' } as never], at: '2026-11-10T00:00:00Z' },
    seen: ['first-lesson'],
  })
  const b = doc({
    lessons: { blinds: { done: false, at: '2026-11-12T00:00:00Z' }, showdown: { done: true, at: '2026-11-11T00:00:00Z' } },
    puzzles: { '2026-11-15': sub('2026-11-15T12:00:00Z', 95), '2026-11-16': sub('2026-11-16T09:00:00Z') },
    quizAttempts: [attempt('q2', '2026-11-11T00:00:00Z'), attempt('q1', '2026-11-10T00:00:00Z')],
    missed: { questions: [], at: '2026-11-11T00:00:00Z' },
    seen: ['quiz-rookie'],
  })

  it('combines progress from two devices', () => {
    const m = mergeProgress(a, b)
    expect(m.lessons).toEqual({
      blinds: { done: false, at: '2026-11-12T00:00:00Z' }, // later change wins
      deck: { done: true, at: '2026-11-10T00:00:00Z' },
      showdown: { done: true, at: '2026-11-11T00:00:00Z' },
    })
    expect(m.puzzles['2026-11-15'].accuracy).toBe(70) // the first answer counts, even if a later one scored better
    expect(Object.keys(m.puzzles)).toEqual(['2026-11-15', '2026-11-16'])
    expect(m.quizAttempts.map((q) => q.id)).toEqual(['q1', 'q2']) // no duplicates
    expect(m.missed.questions).toEqual([]) // most recently changed review list
    expect(m.seen).toEqual(['first-lesson', 'quiz-rookie'])
  })

  it('gives the same result whichever device merges first, and merging again changes nothing', () => {
    const ab = mergeProgress(a, b)
    expect(sameProgress(ab, mergeProgress(b, a))).toBe(true)
    expect(sameProgress(mergeProgress(ab, a), ab)).toBe(true)
    expect(sameProgress(mergeProgress(ab, b), ab)).toBe(true)
    const tie = doc({ lessons: { deck: { done: false, at: '2026-11-10T00:00:00Z' } } })
    expect(sameProgress(mergeProgress(a, tie), mergeProgress(tie, a))).toBe(true)
  })

  it('merging with nothing keeps everything', () => {
    expect(sameProgress(mergeProgress(a, emptyProgress()), mergeProgress(emptyProgress(), a))).toBe(true)
    expect(mergeProgress(a, emptyProgress()).quizAttempts).toHaveLength(1)
  })
})

describe('progress on the device', () => {
  it('round-trips through device storage', () => {
    const store = createMemoryStore()
    const keys = storageKeys('user-1')
    const d = mergeProgress(
      doc({
        lessons: { deck: { done: true, at: '2026-11-10T00:00:00.000Z' }, blinds: { done: false, at: '2026-11-11T00:00:00.000Z' } },
        puzzles: { '2026-11-15': sub('2026-11-15T09:00:00Z') },
        quizAttempts: [attempt('q1', '2026-11-10T00:00:00Z')],
        seen: ['a'],
      }),
      emptyProgress(),
    )
    writeLocalProgress(store, keys, d)
    expect(readLocalProgress(store, keys)).toEqual(d)
    expect(JSON.parse(store.getItem(keys.learning)!).completed).toEqual(['deck'])
  })

  it('reads progress saved before sync existed (no timestamps)', () => {
    const store = createMemoryStore()
    const keys = storageKeys(null)
    store.setItem(keys.learning, JSON.stringify({ completed: ['deck', 'deck', 7] }))
    store.setItem(keys.quizzes, JSON.stringify({ attempts: [attempt('q1', '2026-11-10T00:00:00Z'), { junk: true }], missed: [] }))
    const d = readLocalProgress(store, keys)
    expect(d.lessons).toEqual({ deck: { done: true, at: '1970-01-01T00:00:00.000Z' } })
    expect(d.quizAttempts).toHaveLength(1)
  })

  it('keeps guest and account data under separate keys', () => {
    const guest = storageKeys(null)
    const user = storageKeys('abc')
    for (const k of Object.keys(guest) as (keyof typeof guest)[]) expect(user[k]).not.toBe(guest[k])
    expect(guest.sessions).toBe('river.v1.sessions')
  })

  it('drops malformed cloud documents instead of crashing', () => {
    expect(parseProgressDoc(null)).toEqual(emptyProgress())
    const p = parseProgressDoc({ lessons: { deck: { done: 'yes' }, ok: { done: true, at: 'x' } }, puzzles: { nope: sub('x') }, seen: [1, 'a'] })
    expect(p.lessons).toEqual({ ok: { done: true, at: 'x' } })
    expect(p.puzzles).toEqual({})
    expect(p.seen).toEqual(['a'])
  })
})

describe('syncProgress', () => {
  function cloud(initial: ProgressDoc | null = null) {
    let doc = initial
    let puts = 0
    return {
      remote: { get: async () => doc, put: async (d: ProgressDoc) => void ((doc = d), puts++) },
      doc: () => doc,
      puts: () => puts,
    }
  }

  it('brings progress from one device to another through the cloud', async () => {
    const c = cloud()
    const keys = storageKeys('u')
    const phone = createMemoryStore()
    const laptop = createMemoryStore()
    phone.setItem(keys.learning, JSON.stringify({ completed: ['deck'], changed: { deck: '2026-11-10T00:00:00.000Z' } }))
    laptop.setItem(keys.puzzles, JSON.stringify({ submissions: { '2026-11-15': sub('2026-11-15T09:00:00Z') } }))

    expect(await syncProgress(phone, keys, c.remote)).toEqual({ localChanged: false })
    expect(await syncProgress(laptop, keys, c.remote)).toEqual({ localChanged: true })
    expect(await syncProgress(phone, keys, c.remote)).toEqual({ localChanged: true })

    for (const store of [phone, laptop]) {
      const d = readLocalProgress(store, keys)
      expect(d.lessons.deck.done).toBe(true)
      expect(Object.keys(d.puzzles)).toEqual(['2026-11-15'])
    }
  })

  it("doesn't upload when nothing changed", async () => {
    const c = cloud()
    const store = createMemoryStore()
    const keys = storageKeys('u')
    store.setItem(keys.learning, JSON.stringify({ completed: ['deck'] }))
    await syncProgress(store, keys, c.remote)
    await syncProgress(store, keys, c.remote)
    expect(c.puts()).toBe(1)
  })

  it('keeps a change made while the download was in flight', async () => {
    const keys = storageKeys('u')
    const store = createMemoryStore()
    const remote = {
      get: async () => {
        // The user finishes a lesson while the request is out.
        store.setItem(keys.learning, JSON.stringify({ completed: ['deck'], changed: { deck: '2026-11-16T00:00:00.000Z' } }))
        return null
      },
      put: async () => {},
    }
    await syncProgress(store, keys, remote)
    expect(readLocalProgress(store, keys).lessons.deck.done).toBe(true)
  })

  it("doesn't mark achievements as announced when there's nothing to record", async () => {
    const keys = storageKeys('u')
    const store = createMemoryStore()
    await syncProgress(store, keys, cloud(doc({ lessons: { deck: { done: true, at: '2026-11-10T00:00:00.000Z' } } })).remote)
    expect(store.getItem(keys.achievements)).toBeNull()
  })
})
