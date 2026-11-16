import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getClient, supabaseProgressRemote, supabaseSessionRemote } from '../cloud/supabase'
import { generateDemoSessions } from '../data/demoData'
import { GUEST_KEYS, PROGRESS_CHANGED_EVENT, PROGRESS_RELOAD_EVENT } from '../data/progressStorage'
import {
  createLocalSessionRepository,
  DEMO_SESSIONS_KEY,
  getBrowserStore,
  type SessionRepository,
} from '../data/sessionRepository'
import { createSyncedSessionRepository, type SessionRemote } from '../data/syncedSessionRepository'
import { validateSessionInput, type Session, type SessionErrors, type SessionInput } from '../domain/session'
import { todayIso } from '../lib/dates'
import { mergeProgress, readLocalProgress, writeLocalProgress } from '../sync/progressMerge'
import { syncProgress, type ProgressRemote } from '../sync/progressSync'
import { useAuth, useStorageKeys } from './AuthProvider'
import { useSettings } from './SettingsProvider'
import { useToast } from './ToastProvider'

type SaveResult = { ok: true; session: Session } | { ok: false; errors: SessionErrors }

export type SyncState = 'syncing' | 'synced' | 'offline' | 'error'

export interface CloudStatus {
  state: SyncState
  /** When this device last finished a sync. */
  lastSyncedAt: string | null
  /** Changes saved on this device that haven't reached the cloud yet. */
  pending: number
}

/** What's saved on this device outside any account, which can be moved into one. */
export interface GuestData {
  sessions: number
  hasProgress: boolean
}

interface SessionsContextValue {
  sessions: Session[]
  loading: boolean
  /** True when showing fictional demo records instead of the user's own. */
  isDemo: boolean
  today: string
  create: (input: SessionInput) => Promise<SaveResult>
  update: (id: string, input: SessionInput) => Promise<SaveResult>
  remove: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  /** Sync status while signed in; null for guests and in demo mode. */
  cloud: CloudStatus | null
  syncNow: () => Promise<void>
  /** Guest data on this device, offered for moving into the signed-in account. */
  guestData: GuestData | null
  importGuestData: () => Promise<number>
}

const SessionsContext = createContext<SessionsContextValue | null>(null)

/** Session sync through Supabase, loading the client on first use. */
function cloudSessions(userId: string): SessionRemote {
  return {
    pull: async (cursor) => supabaseSessionRemote(await getClient(), userId).pull(cursor),
    push: async (records) => supabaseSessionRemote(await getClient(), userId).push(records),
  }
}
function cloudProgress(userId: string): ProgressRemote {
  return {
    get: async () => supabaseProgressRemote(await getClient(), userId).get(),
    put: async (doc) => supabaseProgressRemote(await getClient(), userId).put(doc),
  }
}

function readGuestData(): GuestData | null {
  const store = getBrowserStore()
  const sessions = (() => {
    try {
      const raw = store.getItem(GUEST_KEYS.sessions)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.length : 0
    } catch {
      return 0
    }
  })()
  const p = readLocalProgress(store, GUEST_KEYS)
  const hasProgress = Object.values(p.lessons).some((l) => l.done) || Object.keys(p.puzzles).length > 0 || p.quizAttempts.length > 0
  return sessions > 0 || hasProgress ? { sessions, hasProgress } : null
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const { user } = useAuth()
  const keys = useStorageKeys()
  const toast = useToast()
  const isDemo = settings.demoMode
  const userId = user?.id ?? null
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState(todayIso)
  const [cloud, setCloud] = useState<CloudStatus | null>(null)
  const [guestData, setGuestData] = useState<GuestData | null>(null)

  // Demo records, a guest's records and each account's records live under
  // different keys and never mix.
  const accountRepo = useMemo(
    () => (userId ? createSyncedSessionRepository(getBrowserStore(), keys.sessions, cloudSessions(userId)) : null),
    [userId, keys],
  )
  const repo: SessionRepository = useMemo(() => {
    if (isDemo) return createLocalSessionRepository(getBrowserStore(), DEMO_SESSIONS_KEY)
    return accountRepo ?? createLocalSessionRepository(getBrowserStore(), keys.sessions)
  }, [isDemo, accountRepo, keys])

  const progressRemote = useMemo(() => (userId ? cloudProgress(userId) : null), [userId])

  // Keep "today" right if the app stays open past midnight.
  useEffect(() => {
    const t = window.setInterval(() => setToday(todayIso()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      let list = await repo.list()
      if (isDemo && list.length === 0) {
        await repo.replaceAll(generateDemoSessions(todayIso()))
        list = await repo.list()
      }
      if (!cancelled) {
        setSessions(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [repo, isDemo])

  const refresh = useCallback(async () => setSessions(await repo.list()), [repo])

  // ---- Cloud sync ----------------------------------------------------------

  // Sync runs for the signed-in account even while demo mode is showing fictional data.
  const runSync = useCallback(async () => {
    if (!accountRepo) return
    if (navigator.onLine === false) {
      // Known to be offline: don't wait for requests to fail. The 'online' event syncs later.
      setCloud((c) => ({ state: 'offline', lastSyncedAt: c?.lastSyncedAt ?? null, pending: accountRepo.pendingCount() }))
      return
    }
    setCloud((c) => ({ state: 'syncing', lastSyncedAt: c?.lastSyncedAt ?? null, pending: accountRepo.pendingCount() }))
    try {
      await accountRepo.sync()
      if (progressRemote) {
        const { localChanged } = await syncProgress(getBrowserStore(), keys, progressRemote)
        if (localChanged) window.dispatchEvent(new Event(PROGRESS_RELOAD_EVENT))
      }
      await refresh()
      setCloud({ state: 'synced', lastSyncedAt: new Date().toISOString(), pending: accountRepo.pendingCount() })
    } catch {
      await refresh()
      setCloud((c) => ({
        state: navigator.onLine === false ? 'offline' : 'error',
        lastSyncedAt: c?.lastSyncedAt ?? null,
        pending: accountRepo.pendingCount(),
      }))
    }
  }, [accountRepo, progressRemote, keys, refresh])

  // Sync shortly after changes, so a burst of edits goes up together.
  const timer = useRef<number | undefined>(undefined)
  const scheduleSync = useCallback(() => {
    if (!accountRepo) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void runSync(), 800)
  }, [accountRepo, runSync])

  useEffect(() => {
    if (!accountRepo) {
      setCloud(null)
      return
    }
    void runSync()
    const onVisible = () => document.visibilityState === 'visible' && scheduleSync()
    window.addEventListener('online', scheduleSync)
    window.addEventListener('focus', scheduleSync)
    window.addEventListener(PROGRESS_CHANGED_EVENT, scheduleSync)
    document.addEventListener('visibilitychange', onVisible)
    // Pick up changes from other devices while the app stays open.
    const poll = window.setInterval(() => document.visibilityState === 'visible' && void runSync(), 5 * 60_000)
    return () => {
      window.removeEventListener('online', scheduleSync)
      window.removeEventListener('focus', scheduleSync)
      window.removeEventListener(PROGRESS_CHANGED_EVENT, scheduleSync)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(poll)
      window.clearTimeout(timer.current)
    }
  }, [accountRepo, runSync, scheduleSync])

  // ---- Guest data ------------------------------------------------------------

  useEffect(() => {
    setGuestData(userId ? readGuestData() : null)
  }, [userId])

  const importGuestData = useCallback(async () => {
    if (!accountRepo) return 0
    const store = getBrowserStore()
    const guestSessions = await createLocalSessionRepository(store, GUEST_KEYS.sessions).list()
    const added = await accountRepo.importSessions(guestSessions)
    writeLocalProgress(store, keys, mergeProgress(readLocalProgress(store, keys), readLocalProgress(store, GUEST_KEYS)))
    window.dispatchEvent(new Event(PROGRESS_RELOAD_EVENT))
    // It now lives in the account; remove the guest copy so it can't be added twice or seen after sign-out.
    for (const k of Object.values(GUEST_KEYS)) store.removeItem(k)
    setGuestData(null)
    await refresh()
    void runSync()
    return added
  }, [accountRepo, keys, refresh, runSync])

  // ---- Edits -----------------------------------------------------------------

  const create = useCallback(
    async (input: SessionInput): Promise<SaveResult> => {
      const v = validateSessionInput(input, todayIso())
      if (!v.ok) return v
      try {
        const session = await repo.create(v.value)
        await refresh()
        scheduleSync()
        toast('Session saved')
        return { ok: true, session }
      } catch {
        toast("Couldn't save. Check that your browser allows site storage.", 'error')
        return { ok: false, errors: {} }
      }
    },
    [repo, refresh, scheduleSync, toast],
  )

  const update = useCallback(
    async (id: string, input: SessionInput): Promise<SaveResult> => {
      const v = validateSessionInput(input, todayIso())
      if (!v.ok) return v
      try {
        const session = await repo.update(id, v.value)
        await refresh()
        scheduleSync()
        toast('Session updated')
        return { ok: true, session }
      } catch {
        toast("Couldn't update this session.", 'error')
        return { ok: false, errors: {} }
      }
    },
    [repo, refresh, scheduleSync, toast],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await repo.remove(id)
        await refresh()
        scheduleSync()
        toast('Session deleted')
      } catch {
        toast("Couldn't delete this session.", 'error')
      }
    },
    [repo, refresh, scheduleSync, toast],
  )

  /** Delete every record. In demo mode this restores the original demo set. */
  const clearAll = useCallback(async () => {
    await repo.clear()
    if (isDemo) await repo.replaceAll(generateDemoSessions(todayIso()))
    await refresh()
    scheduleSync()
  }, [repo, refresh, isDemo, scheduleSync])

  const value = useMemo(
    () => ({ sessions, loading, isDemo, today, create, update, remove, clearAll, cloud, syncNow: runSync, guestData, importGuestData }),
    [sessions, loading, isDemo, today, create, update, remove, clearAll, cloud, runSync, guestData, importGuestData],
  )
  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions must be used inside SessionsProvider')
  return ctx
}
