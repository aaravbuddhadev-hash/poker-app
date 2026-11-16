import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { generateDemoSessions } from '../data/demoData'
import {
  createLocalSessionRepository,
  DEMO_SESSIONS_KEY,
  getBrowserStore,
  SESSIONS_KEY,
  type SessionRepository,
} from '../data/sessionRepository'
import { validateSessionInput, type Session, type SessionErrors, type SessionInput } from '../domain/session'
import { todayIso } from '../lib/dates'
import { useSettings } from './SettingsProvider'
import { useToast } from './ToastProvider'

type SaveResult = { ok: true; session: Session } | { ok: false; errors: SessionErrors }

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
}

const SessionsContext = createContext<SessionsContextValue | null>(null)

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const toast = useToast()
  const isDemo = settings.demoMode
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState(todayIso)

  // Real and demo records live under different keys and never mix.
  const repo: SessionRepository = useMemo(
    () => createLocalSessionRepository(getBrowserStore(), isDemo ? DEMO_SESSIONS_KEY : SESSIONS_KEY),
    [isDemo],
  )

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

  const create = useCallback(
    async (input: SessionInput): Promise<SaveResult> => {
      const v = validateSessionInput(input, todayIso())
      if (!v.ok) return v
      try {
        const session = await repo.create(v.value)
        await refresh()
        toast('Session saved')
        return { ok: true, session }
      } catch {
        toast("Couldn't save. Check that your browser allows site storage.", 'error')
        return { ok: false, errors: {} }
      }
    },
    [repo, refresh, toast],
  )

  const update = useCallback(
    async (id: string, input: SessionInput): Promise<SaveResult> => {
      const v = validateSessionInput(input, todayIso())
      if (!v.ok) return v
      try {
        const session = await repo.update(id, v.value)
        await refresh()
        toast('Session updated')
        return { ok: true, session }
      } catch {
        toast("Couldn't update this session.", 'error')
        return { ok: false, errors: {} }
      }
    },
    [repo, refresh, toast],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await repo.remove(id)
        await refresh()
        toast('Session deleted')
      } catch {
        toast("Couldn't delete this session.", 'error')
      }
    },
    [repo, refresh, toast],
  )

  /** Delete every record. In demo mode this restores the original demo set. */
  const clearAll = useCallback(async () => {
    await repo.clear()
    if (isDemo) await repo.replaceAll(generateDemoSessions(todayIso()))
    await refresh()
  }, [repo, refresh, isDemo])

  const value = useMemo(
    () => ({ sessions, loading, isDemo, today, create, update, remove, clearAll }),
    [sessions, loading, isDemo, today, create, update, remove, clearAll],
  )
  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions must be used inside SessionsProvider')
  return ctx
}
