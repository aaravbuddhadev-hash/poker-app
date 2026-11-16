import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckIcon } from '../components/icons'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const ToastContext = createContext<((message: string, tone?: Toast['tone']) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++nextId.current
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-8"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/30"
            >
              <span
                className={`grid size-6 place-items-center rounded-full ${t.tone === 'success' ? 'bg-emerald text-on-accent' : 'bg-neg text-white'}`}
              >
                {t.tone === 'success' ? <CheckIcon width={14} height={14} strokeWidth={3} /> : '!'}
              </span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
