import type { Session } from '../domain/session'
import {
  deleteLocal,
  markPushed,
  mergeRemote,
  parseSyncState,
  pendingRecords,
  putLocal,
  visibleSessions,
  type SyncedSession,
  type SyncState,
} from '../sync/sessionSync'
import { NotFoundError, type KeyValueStore, type SessionRepository } from './sessionRepository'

/** The cloud side of session sync. Implemented with Supabase in src/cloud; faked in tests. */
export interface SessionRemote {
  /** Rows changed on the server after `cursor` (all rows when null), oldest first. */
  pull(cursor: string | null): Promise<{ session: SyncedSession; serverUpdatedAt: string }[]>
  /** Insert or update these rows. */
  push(records: SyncedSession[]): Promise<void>
}

export interface SyncedSessionRepository extends SessionRepository {
  /** Download remote changes, then upload local ones. Safe to call any time. */
  sync(): Promise<void>
  /** Number of local changes not yet uploaded. */
  pendingCount(): number
  /**
   * Add sessions from elsewhere (this device's guest data) without touching
   * the account's own. Ids are kept, so adding the same data twice can't
   * create duplicates. Returns how many were added.
   */
  importSessions(sessions: Session[]): Promise<number>
}

interface Options {
  now?: () => Date
  newId?: () => string
}

/**
 * A signed-in user's sessions: saved on this device first (so the app works
 * offline and feels instant), then synced with the cloud by `sync()`.
 */
export function createSyncedSessionRepository(
  store: KeyValueStore,
  key: string,
  remote: SessionRemote,
  opts: Options = {},
): SyncedSessionRepository {
  const now = opts.now ?? (() => new Date())
  const newId = opts.newId ?? (() => `s_${crypto.randomUUID()}`)
  // One sync at a time; a request made during a sync runs once it finishes.
  let running: Promise<void> | null = null
  let again = false

  const read = (): SyncState => parseSyncState(store.getItem(key))
  const write = (s: SyncState) => store.setItem(key, JSON.stringify(s))

  async function syncOnce() {
    const pulled = await remote.pull(read().cursor)
    // Re-read after every await: the user may have edited something meanwhile.
    write(mergeRemote(read(), pulled))
    const pending = pendingRecords(read())
    if (pending.length === 0) return
    await remote.push(pending)
    write(markPushed(read(), pending))
  }

  function tombstoneAll(state: SyncState): SyncState {
    for (const s of visibleSessions(state)) state = deleteLocal(state, s.id, laterThan(s.updatedAt, now()))
    return state
  }

  return {
    async list() {
      return visibleSessions(read())
    },
    async create(input) {
      const ts = now().toISOString()
      const session: Session = { ...input, id: newId(), createdAt: ts, updatedAt: ts }
      write(putLocal(read(), session))
      return session
    },
    async update(id, input) {
      const state = read()
      const existing = state.records[id]
      if (!existing || existing.deletedAt) throw new NotFoundError(`Session ${id} not found`)
      const next: Session = { ...input, id, createdAt: existing.createdAt, updatedAt: laterThan(existing.updatedAt, now()) }
      write(putLocal(state, next))
      return next
    },
    async remove(id) {
      const state = read()
      const existing = state.records[id]
      if (!existing || existing.deletedAt) throw new NotFoundError(`Session ${id} not found`)
      write(deleteLocal(state, id, laterThan(existing.updatedAt, now())))
    },
    async replaceAll(sessions) {
      let state = tombstoneAll(read())
      for (const s of sessions) state = putLocal(state, { ...s, updatedAt: laterThan(state.records[s.id]?.updatedAt ?? '', now()) })
      write(state)
    },
    /** Delete every session in the account (synced to other devices as deletes). */
    async clear() {
      write(tombstoneAll(read()))
    },
    sync() {
      if (running) {
        again = true
        return running
      }
      running = (async () => {
        try {
          do {
            again = false
            await syncOnce()
          } while (again)
        } finally {
          running = null
        }
      })()
      return running
    },
    pendingCount() {
      return read().dirty.length
    },
    async importSessions(sessions) {
      let state = read()
      let added = 0
      for (const s of sessions) {
        const existing = state.records[s.id]
        if (existing && !existing.deletedAt) continue
        state = putLocal(state, { ...s, updatedAt: laterThan(existing?.updatedAt ?? s.updatedAt, now()) })
        added++
      }
      write(state)
      return added
    },
  }
}

/**
 * An edit's timestamp must sort after the version it replaces, or "last writer
 * wins" would throw it away. Normally that's just the current time; this guards
 * against a device clock that is behind another device's.
 */
export function laterThan(previous: string, now: Date): string {
  const t = now.toISOString()
  if (t > previous) return t
  return new Date(new Date(previous).getTime() + 1).toISOString()
}
