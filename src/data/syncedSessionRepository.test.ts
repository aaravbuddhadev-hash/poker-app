import { describe, expect, it } from 'vitest'
import type { SessionInput } from '../domain/session'
import { fromRow, normalizeTime, parseSyncState, toRow, type SyncedSession } from '../sync/sessionSync'
import { createMemoryStore } from './sessionRepository'
import { createSyncedSessionRepository, laterThan, type SessionRemote } from './syncedSessionRepository'

/**
 * An in-memory stand-in for the Supabase table that follows the same rules as
 * the real one (see supabase/migrations): an older edit never replaces a newer
 * row, and every accepted write gets a fresh server timestamp.
 */
function fakeServer() {
  const rows = new Map<string, { session: SyncedSession; serverUpdatedAt: string }>()
  let tick = 0
  let offline = false
  const stamp = () => `2026-01-01T00:00:00.${String(++tick).padStart(6, '0')}Z`
  const remote: SessionRemote = {
    async pull(cursor) {
      if (offline) throw new Error('offline')
      return [...rows.values()]
        .filter((r) => cursor === null || r.serverUpdatedAt > cursor)
        .sort((a, b) => a.serverUpdatedAt.localeCompare(b.serverUpdatedAt))
        .map((r) => structuredClone(r))
    },
    async push(records) {
      if (offline) throw new Error('offline')
      for (const r of records) {
        const old = rows.get(r.id)
        if (old && r.updatedAt < old.session.updatedAt) continue
        rows.set(r.id, { session: structuredClone(r), serverUpdatedAt: stamp() })
      }
    },
  }
  return { remote, rows, setOffline: (v: boolean) => (offline = v) }
}

/** A device: its own storage and clock, talking to the shared server. */
function device(remote: SessionRemote, startMs: number) {
  let t = startMs
  let n = 0
  const store = createMemoryStore()
  const repo = createSyncedSessionRepository(store, 'k', remote, {
    now: () => new Date((t += 1000)),
    newId: () => `s_${startMs}_${++n}`,
  })
  return { repo, store, advance: (ms: number) => (t += ms) }
}

const input = (netCents: number, extra: Partial<SessionInput> = {}): SessionInput => ({ date: '2026-11-10', mode: 'simple', netCents, ...extra })
const T0 = Date.parse('2026-11-16T10:00:00Z')

describe('synced session repository', () => {
  it('saves locally first and uploads on sync', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const s = await a.repo.create(input(1500))
    expect(await a.repo.list()).toEqual([s])
    expect(a.repo.pendingCount()).toBe(1)
    expect(server.rows.size).toBe(0)
    await a.repo.sync()
    expect(a.repo.pendingCount()).toBe(0)
    expect(server.rows.get(s.id)?.session.netCents).toBe(1500)
  })

  it('brings sessions from one device to another', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const b = device(server.remote, T0 + 500)
    const s = await a.repo.create(input(-2000, { notes: 'Rough night' }))
    await a.repo.sync()
    await b.repo.sync()
    expect(await b.repo.list()).toEqual([s])
  })

  it('syncs deletes so they are not brought back', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const b = device(server.remote, T0 + 500)
    const s = await a.repo.create(input(100))
    await a.repo.sync()
    await b.repo.sync()
    await b.repo.remove(s.id)
    await b.repo.sync()
    await a.repo.sync()
    expect(await a.repo.list()).toEqual([])
    expect(server.rows.get(s.id)?.session.deletedAt).toBeDefined()
  })

  it('keeps the later edit when two devices change the same session', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const b = device(server.remote, T0)
    const s = await a.repo.create(input(100))
    await a.repo.sync()
    await b.repo.sync()

    // Both edit while out of touch; B's edit is later. A uploads last, but loses.
    await a.repo.update(s.id, input(200))
    b.advance(60_000)
    await b.repo.update(s.id, input(300))
    await b.repo.sync()
    await a.repo.sync()
    await b.repo.sync()

    expect((await a.repo.list())[0].netCents).toBe(300)
    expect((await b.repo.list())[0].netCents).toBe(300)
    expect(server.rows.get(s.id)?.session.netCents).toBe(300)
    expect(a.repo.pendingCount()).toBe(0)
  })

  it('a newer unsent local edit beats an older copy already on the server', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const b = device(server.remote, T0)
    const s = await a.repo.create(input(100))
    await a.repo.sync()
    await b.repo.sync()
    await b.repo.update(s.id, input(150)) // earlier edit, uploaded first
    await b.repo.sync()
    a.advance(60_000)
    await a.repo.update(s.id, input(999)) // later edit
    await a.repo.sync()
    await b.repo.sync()
    expect((await a.repo.list())[0].netCents).toBe(999)
    expect((await b.repo.list())[0].netCents).toBe(999)
  })

  it('works offline and catches up when back online', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    server.setOffline(true)
    await a.repo.create(input(1))
    await a.repo.create(input(2))
    await expect(a.repo.sync()).rejects.toThrow('offline')
    expect(a.repo.pendingCount()).toBe(2)
    expect(await a.repo.list()).toHaveLength(2)
    server.setOffline(false)
    await a.repo.sync()
    expect(a.repo.pendingCount()).toBe(0)
    expect(server.rows.size).toBe(2)
  })

  it('downloads only what changed since the last sync', async () => {
    const server = fakeServer()
    const pulls: (string | null)[] = []
    const spy: SessionRemote = { pull: (c) => (pulls.push(c), server.remote.pull(c)), push: server.remote.push }
    const a = device(spy, T0)
    await a.repo.create(input(1))
    await a.repo.sync()
    await a.repo.sync()
    expect(pulls[0]).toBeNull()
    expect(pulls[1]).toBeNull() // the first pull ran before the upload, so it found nothing
    await a.repo.sync()
    expect(pulls[2]).toBe([...server.rows.values()][0].serverUpdatedAt)
  })

  it('does not lose an edit made while a sync is running', async () => {
    const server = fakeServer()
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const slow: SessionRemote = { pull: async (c) => (await gate, server.remote.pull(c)), push: server.remote.push }
    const a = device(slow, T0)
    const first = a.repo.sync()
    const s = await a.repo.create(input(42)) // happens mid-sync
    const second = a.repo.sync() // queued behind the running one
    release()
    await Promise.all([first, second])
    expect(server.rows.get(s.id)?.session.netCents).toBe(42)
    expect(a.repo.pendingCount()).toBe(0)
  })

  it('clear() deletes everything in the account, on every device', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const b = device(server.remote, T0)
    await a.repo.create(input(1))
    await a.repo.create(input(2))
    await a.repo.sync()
    await b.repo.sync()
    await b.repo.clear()
    await b.repo.sync()
    await a.repo.sync()
    expect(await a.repo.list()).toEqual([])
  })

  it('imports guest sessions once, keeping their ids', async () => {
    const server = fakeServer()
    const a = device(server.remote, T0)
    const guest = [
      { ...input(500), id: 's_guest1', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' },
      { ...input(-300), id: 's_guest2', createdAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' },
    ]
    expect(await a.repo.importSessions(guest)).toBe(2)
    expect(await a.repo.importSessions(guest)).toBe(0)
    await a.repo.sync()
    expect((await a.repo.list()).map((s) => s.id).sort()).toEqual(['s_guest1', 's_guest2'])
    expect(server.rows.size).toBe(2)
  })

  it('throws for missing sessions', async () => {
    const a = device(fakeServer().remote, T0)
    await expect(a.repo.update('nope', input(1))).rejects.toThrow()
    await expect(a.repo.remove('nope')).rejects.toThrow()
  })
})

describe('sync helpers', () => {
  it('a new timestamp always sorts after the one it replaces, even with a slow clock', () => {
    const prev = '2026-11-16T12:00:00.000Z'
    expect(laterThan(prev, new Date('2026-11-16T12:00:05.000Z'))).toBe('2026-11-16T12:00:05.000Z')
    expect(laterThan(prev, new Date('2026-11-16T11:00:00.000Z'))).toBe('2026-11-16T12:00:00.001Z')
  })

  it('maps sessions to database rows and back without losing anything', () => {
    const s: SyncedSession = {
      id: 's_1',
      date: '2026-11-10',
      mode: 'detailed',
      netCents: 2500,
      startCents: 10000,
      endCents: 12500,
      durationMinutes: 90,
      gameType: "No-Limit Hold'em",
      notes: 'Good table',
      createdAt: '2026-11-10T20:00:00.000Z',
      updatedAt: '2026-11-10T21:00:00.000Z',
    }
    expect(fromRow(toRow(s))).toEqual(s)
    const { startCents: _s, endCents: _e, ...simple } = s
    const deleted: SyncedSession = { ...simple, mode: 'simple', deletedAt: '2026-11-11T00:00:00.000Z' }
    const back = fromRow(toRow(deleted))!
    expect(back).toEqual(deleted)
    expect('startCents' in back).toBe(false)
  })

  it("reads Postgres' timestamp format and skips invalid rows", () => {
    expect(normalizeTime('2026-11-16 03:04:05.123+00')).toBe('2026-11-16T03:04:05.123Z')
    const row = toRow({ id: 's', date: '2026-11-10', mode: 'simple', netCents: 1, createdAt: 'x', updatedAt: 'x' })
    expect(fromRow({ ...row, date: 'not a date' })).toBeNull()
    expect(fromRow({ ...row, game_type: 'Blackjack' })).toBeNull()
  })

  it('recovers from corrupt stored state', () => {
    expect(parseSyncState('{oops')).toEqual({ records: {}, dirty: [], cursor: null })
    const state = parseSyncState(JSON.stringify({ records: { a: { bad: true } }, dirty: ['a', 'ghost'], cursor: 5 }))
    expect(state).toEqual({ records: {}, dirty: [], cursor: null })
  })
})
