import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getBrowserStore } from '../data/sessionRepository'

/** Lesson progress, saved on this device. Shape: { completed: string[] } of lesson ids. */
export const LEARNING_KEY = 'river.v1.learning'

function load(): string[] {
  try {
    const raw = getBrowserStore().getItem(LEARNING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { completed?: unknown }
    return Array.isArray(parsed.completed) ? parsed.completed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

interface LearningContextValue {
  completed: ReadonlySet<string>
  setComplete: (lessonId: string, done: boolean) => void
  reset: () => void
}

const LearningContext = createContext<LearningContextValue | null>(null)

export function LearningProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<string[]>(load)

  useEffect(() => {
    try {
      getBrowserStore().setItem(LEARNING_KEY, JSON.stringify({ completed }))
    } catch {
      // Storage blocked: progress still works for this visit.
    }
  }, [completed])

  const setComplete = useCallback((id: string, done: boolean) => {
    setCompleted((c) => (done ? (c.includes(id) ? c : [...c, id]) : c.filter((x) => x !== id)))
  }, [])
  const reset = useCallback(() => setCompleted([]), [])

  const value = useMemo(() => ({ completed: new Set(completed), setComplete, reset }), [completed, setComplete, reset])
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning() {
  const ctx = useContext(LearningContext)
  if (!ctx) throw new Error('useLearning must be used inside LearningProvider')
  return ctx
}
