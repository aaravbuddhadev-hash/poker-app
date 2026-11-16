import { isSession, type Session, type SessionInput } from '../domain/session'

/**
 * Where session records live. The app talks only to this interface, so the
 * local-storage version can be swapped for a cloud database (e.g. Supabase
 * with row-level security) without touching any screen.
 */
export interface SessionRepository {
  list(): Promise<Session[]>
  create(input: SessionInput): Promise<Session>
  update(id: string, input: SessionInput): Promise<Session>
  remove(id: string): Promise<void>
  /** Replace every record (used to seed demo data). */
  replaceAll(sessions: Session[]): Promise<void>
  clear(): Promise<void>
}

/** The subset of the Web Storage API we need; easy to fake in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const SESSIONS_KEY = 'river.v1.sessions'
export const DEMO_SESSIONS_KEY = 'river.v1.demo.sessions'

interface Options {
  now?: () => Date
  newId?: () => string
}

export class NotFoundError extends Error {}

export function createLocalSessionRepository(store: KeyValueStore, key: string, opts: Options = {}): SessionRepository {
  const now = opts.now ?? (() => new Date())
  const newId = opts.newId ?? defaultId

  function read(): Session[] {
    const raw = store.getItem(key)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      // Skip any record that doesn't match the schema instead of crashing.
      return Array.isArray(parsed) ? parsed.filter(isSession) : []
    } catch {
      return []
    }
  }

  function write(sessions: Session[]) {
    store.setItem(key, JSON.stringify(sessions))
  }

  return {
    async list() {
      return read()
    },
    async create(input) {
      const ts = now().toISOString()
      const session: Session = { ...input, id: newId(), createdAt: ts, updatedAt: ts }
      write([...read(), session])
      return session
    },
    async update(id, input) {
      const all = read()
      const idx = all.findIndex((s) => s.id === id)
      if (idx === -1) throw new NotFoundError(`Session ${id} not found`)
      // Rebuild from input so fields cleared in the form are removed.
      const next: Session = { ...input, id, createdAt: all[idx].createdAt, updatedAt: now().toISOString() }
      all[idx] = next
      write(all)
      return next
    },
    async remove(id) {
      const all = read()
      const next = all.filter((s) => s.id !== id)
      if (next.length === all.length) throw new NotFoundError(`Session ${id} not found`)
      write(next)
    },
    async replaceAll(sessions) {
      write(sessions)
    },
    async clear() {
      store.removeItem(key)
    },
  }
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `s_${crypto.randomUUID()}`
  return `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** In-memory store, used in tests and when localStorage is unavailable. */
export function createMemoryStore(): KeyValueStore {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

/** localStorage if it works (it can throw in private mode), else memory. */
export function getBrowserStore(): KeyValueStore {
  try {
    const probe = '__river_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return createMemoryStore()
  }
}
