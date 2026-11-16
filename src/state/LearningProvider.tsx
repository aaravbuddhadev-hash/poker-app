import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadLearning, PROGRESS_RELOAD_EVENT, writeLocalChange, type LearningData } from '../data/progressStorage'
import { getBrowserStore } from '../data/sessionRepository'
import { useStorageKeys } from './AuthProvider'

/** Lesson progress, saved on this device (and synced when signed in). */
interface LearningContextValue {
  completed: ReadonlySet<string>
  setComplete: (lessonId: string, done: boolean) => void
}

const LearningContext = createContext<LearningContextValue | null>(null)

export function LearningProvider({ children }: { children: ReactNode }) {
  const key = useStorageKeys().learning
  const [data, setData] = useState<LearningData>(() => loadLearning(getBrowserStore(), key))

  // A sync wrote new progress to storage: show it.
  useEffect(() => {
    const reload = () => setData(loadLearning(getBrowserStore(), key))
    window.addEventListener(PROGRESS_RELOAD_EVENT, reload)
    return () => window.removeEventListener(PROGRESS_RELOAD_EVENT, reload)
  }, [key])

  const setComplete = useCallback(
    (id: string, done: boolean) => {
      setData((d) => {
        if (d.completed.includes(id) === done) return d
        const next: LearningData = {
          completed: done ? [...d.completed, id] : d.completed.filter((x) => x !== id),
          // Remember when, so devices can agree on the latest change.
          changed: { ...d.changed, [id]: new Date().toISOString() },
        }
        writeLocalChange(getBrowserStore(), key, next)
        return next
      })
    },
    [key],
  )

  const value = useMemo(() => ({ completed: new Set(data.completed), setComplete }), [data, setComplete])
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning() {
  const ctx = useContext(LearningContext)
  if (!ctx) throw new Error('useLearning must be used inside LearningProvider')
  return ctx
}
