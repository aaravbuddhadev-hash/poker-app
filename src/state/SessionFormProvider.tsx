import { AnimatePresence } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { SessionForm } from '../components/SessionForm'
import type { Session } from '../domain/session'

interface FormContextValue {
  /** Open the add form, optionally pre-set to a date ("YYYY-MM-DD"). */
  openNew: (date?: string) => void
  openEdit: (session: Session) => void
}

const FormContext = createContext<FormContextValue | null>(null)

/** Lets any screen open the add/edit session sheet. */
export function SessionFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; session?: Session; date?: string; key: number }>({ open: false, key: 0 })

  const openNew = useCallback(
    (date?: string) => setState((s) => ({ open: true, date: typeof date === 'string' ? date : undefined, key: s.key + 1 })),
    [],
  )
  const openEdit = useCallback((session: Session) => setState((s) => ({ open: true, session, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])

  return (
    <FormContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state.open && <SessionForm key={state.key} session={state.session} initialDate={state.date} onClose={close} />}
      </AnimatePresence>
    </FormContext.Provider>
  )
}

export function useSessionForm() {
  const ctx = useContext(FormContext)
  if (!ctx) throw new Error('useSessionForm must be used inside SessionFormProvider')
  return ctx
}
