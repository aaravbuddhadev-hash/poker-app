import { describe, expect, it } from 'vitest'
import { summarize } from '../domain/analytics'
import { generateDemoSessions } from './demoData'
import {
  createLocalSessionRepository,
  createMemoryStore,
  DEMO_SESSIONS_KEY,
  NotFoundError,
  SESSIONS_KEY,
} from './sessionRepository'

function setup() {
  const store = createMemoryStore()
  let n = 0
  let clock = Date.UTC(2026, 10, 15, 12)
  const repo = createLocalSessionRepository(store, SESSIONS_KEY, {
    newId: () => `id${++n}`,
    now: () => new Date((clock += 1000)),
  })
  return { store, repo }
}

describe('local session repository', () => {
  it('creates sessions and updates lifetime totals', async () => {
    const { repo } = setup()
    await repo.create({ date: '2026-11-01', mode: 'simple', netCents: 5000 })
    await repo.create({ date: '2026-11-02', mode: 'simple', netCents: -2500 })
    const all = await repo.list()
    expect(all.map((x) => x.id)).toEqual(['id1', 'id2'])
    expect(summarize(all).netCents).toBe(2500)
  })

  it('edits a session, keeping createdAt and dropping cleared fields', async () => {
    const { repo } = setup()
    const s = await repo.create({ date: '2026-11-01', mode: 'simple', netCents: 5000, notes: 'old note' })
    const edited = await repo.update(s.id, { date: '2026-11-01', mode: 'simple', netCents: -100 })
    expect(edited.createdAt).toBe(s.createdAt)
    expect(edited.updatedAt > s.updatedAt).toBe(true)
    expect(edited.notes).toBeUndefined()
    expect(summarize(await repo.list()).netCents).toBe(-100)
  })

  it('deletes a session and updates totals', async () => {
    const { repo } = setup()
    const a = await repo.create({ date: '2026-11-01', mode: 'simple', netCents: 5000 })
    await repo.create({ date: '2026-11-02', mode: 'simple', netCents: 700 })
    await repo.remove(a.id)
    expect(summarize(await repo.list()).netCents).toBe(700)
  })

  it('throws NotFoundError for unknown ids', async () => {
    const { repo } = setup()
    await expect(repo.remove('nope')).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.update('nope', { date: '2026-11-01', mode: 'simple', netCents: 0 })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('survives corrupt storage by skipping bad records', async () => {
    const { store, repo } = setup()
    store.setItem(SESSIONS_KEY, 'not json')
    expect(await repo.list()).toEqual([])
    store.setItem(
      SESSIONS_KEY,
      JSON.stringify([{ id: 'ok', date: '2026-11-01', mode: 'simple', netCents: 1, createdAt: 't', updatedAt: 't' }, { junk: true }]),
    )
    expect((await repo.list()).map((x) => x.id)).toEqual(['ok'])
  })

  it('keeps demo data separate from real data', async () => {
    const store = createMemoryStore()
    const real = createLocalSessionRepository(store, SESSIONS_KEY)
    const demo = createLocalSessionRepository(store, DEMO_SESSIONS_KEY)
    await real.create({ date: '2026-11-01', mode: 'simple', netCents: 100 })
    await demo.replaceAll(generateDemoSessions('2026-11-15'))
    expect(await real.list()).toHaveLength(1)
    await demo.clear()
    expect(await real.list()).toHaveLength(1)
  })
})

describe('demo data', () => {
  it('is deterministic, labeled and never in the future', () => {
    const a = generateDemoSessions('2026-11-15')
    const b = generateDemoSessions('2026-11-15')
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(40)
    expect(a.every((x) => x.id.startsWith('demo_') && x.date <= '2026-11-15')).toBe(true)
    expect(a.every((x) => Number.isInteger(x.netCents))).toBe(true)
  })
})
