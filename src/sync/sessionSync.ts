import { isSession, type Session } from '../domain/session'

/**
 * Offline-first session sync, as pure functions.
 *
 * Each device keeps a full copy of the account's sessions plus a list of ids
 * it changed but hasn't uploaded yet ("dirty"). Deletes become tombstones
 * (`deletedAt`) so other devices hear about them. When two devices edit the
 * same session, the edit with the later `updatedAt` wins (last writer wins);
 * the database enforces the same rule, so the order uploads arrive in doesn't
 * matter.
 */
export interface SyncedSession extends Session {
  deletedAt?: string
}

export interface SyncState {
  records: Record<string, SyncedSession>
  /** Ids changed on this device and not yet uploaded. */
  dirty: string[]
  /** Server time of the newest change already downloaded, or null before the first sync. */
  cursor: string | null
}

export const emptySyncState = (): SyncState => ({ records: {}, dirty: [], cursor: null })

/** Sessions to show: everything except tombstones. */
export function visibleSessions(state: SyncState): Session[] {
  return Object.values(state.records)
    .filter((r) => !r.deletedAt)
    .map(stripSync)
}

export function stripSync(r: SyncedSession): Session {
  const { deletedAt: _deleted, ...session } = r
  return session
}

/** Record a local create or edit. */
export function putLocal(state: SyncState, session: Session): SyncState {
  return {
    ...state,
    records: { ...state.records, [session.id]: { ...session } },
    dirty: addId(state.dirty, session.id),
  }
}

/** Record a local delete as a tombstone. */
export function deleteLocal(state: SyncState, id: string, at: string): SyncState {
  const existing = state.records[id]
  if (!existing || existing.deletedAt) return state
  return {
    ...state,
    records: { ...state.records, [id]: { ...existing, updatedAt: at, deletedAt: at } },
    dirty: addId(state.dirty, id),
  }
}

/**
 * Apply downloaded rows. A remote row replaces the local copy unless the local
 * copy is a newer, not-yet-uploaded edit. On a tie the server copy wins.
 */
export function mergeRemote(state: SyncState, remote: { session: SyncedSession; serverUpdatedAt: string }[]): SyncState {
  const records = { ...state.records }
  let dirty = state.dirty
  let cursor = state.cursor
  for (const { session, serverUpdatedAt } of remote) {
    const local = records[session.id]
    const localWins = local !== undefined && dirty.includes(session.id) && local.updatedAt > session.updatedAt
    if (!localWins) {
      records[session.id] = session
      dirty = dirty.filter((id) => id !== session.id)
    }
    if (cursor === null || serverUpdatedAt > cursor) cursor = serverUpdatedAt
  }
  return { records, dirty, cursor }
}

/** After an upload succeeds, clear the ids that haven't changed again since. */
export function markPushed(state: SyncState, pushed: SyncedSession[]): SyncState {
  const done = new Set(pushed.filter((p) => state.records[p.id]?.updatedAt === p.updatedAt).map((p) => p.id))
  return { ...state, dirty: state.dirty.filter((id) => !done.has(id)) }
}

export function pendingRecords(state: SyncState): SyncedSession[] {
  return state.dirty.map((id) => state.records[id]).filter((r): r is SyncedSession => r !== undefined)
}

function addId(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id]
}

/** Read a stored state back, dropping anything malformed instead of crashing. */
export function parseSyncState(raw: string | null): SyncState {
  if (!raw) return emptySyncState()
  try {
    const p = JSON.parse(raw) as Partial<SyncState>
    const records: Record<string, SyncedSession> = {}
    for (const [id, r] of Object.entries(p.records ?? {})) {
      if (isSyncedSession(r) && r.id === id) records[id] = r
    }
    const dirty = Array.isArray(p.dirty) ? p.dirty.filter((id): id is string => typeof id === 'string' && id in records) : []
    const cursor = typeof p.cursor === 'string' ? p.cursor : null
    return { records, dirty, cursor }
  } catch {
    return emptySyncState()
  }
}

export function isSyncedSession(v: unknown): v is SyncedSession {
  return isSession(v) && ((v as SyncedSession).deletedAt === undefined || typeof (v as SyncedSession).deletedAt === 'string')
}

// ---------------------------------------------------------------------------
// Database row mapping (snake_case columns, nulls for empty fields).
// ---------------------------------------------------------------------------

export interface SessionRow {
  id: string
  date: string
  mode: string
  net_cents: number
  start_cents: number | null
  end_cents: number | null
  duration_minutes: number | null
  game_type: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  server_updated_at?: string
}

export function toRow(s: SyncedSession): SessionRow {
  return {
    id: s.id,
    date: s.date,
    mode: s.mode,
    net_cents: s.netCents,
    start_cents: s.startCents ?? null,
    end_cents: s.endCents ?? null,
    duration_minutes: s.durationMinutes ?? null,
    game_type: s.gameType ?? null,
    notes: s.notes ?? null,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    deleted_at: s.deletedAt ?? null,
  }
}

/** Map a row back to a session, or null if it isn't valid (it's skipped, not crashed on). */
export function fromRow(row: SessionRow): SyncedSession | null {
  const s: SyncedSession = {
    id: row.id,
    date: row.date,
    mode: row.mode as SyncedSession['mode'],
    netCents: Number(row.net_cents),
    // Postgres returns its own timestamp format; normalize so comparisons with local ISO strings are fair.
    createdAt: normalizeTime(row.created_at),
    updatedAt: normalizeTime(row.updated_at),
  }
  if (row.start_cents !== null) s.startCents = Number(row.start_cents)
  if (row.end_cents !== null) s.endCents = Number(row.end_cents)
  if (row.duration_minutes !== null) s.durationMinutes = row.duration_minutes
  if (row.game_type !== null) s.gameType = row.game_type as SyncedSession['gameType']
  if (row.notes !== null) s.notes = row.notes
  if (row.deleted_at !== null) s.deletedAt = normalizeTime(row.deleted_at)
  return isSyncedSession(s) ? s : null
}

/** "2026-11-16 03:04:05.123+00" or "...T...Z" → canonical ISO "2026-11-16T03:04:05.123Z". */
export function normalizeTime(t: string): string {
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? t : d.toISOString()
}
