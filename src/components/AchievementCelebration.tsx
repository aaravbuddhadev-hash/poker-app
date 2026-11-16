import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import type { AchievementStatus } from '../achievements/achievements'
import { AchievementGlyph } from './AchievementBadge'
import { haptic } from '../native/native'

const SHOW_MS = 4600
const SPARKS = 12
const GOLD = '#d4b062'

/**
 * The moment an achievement unlocks: a card rises in, the medal turns from
 * locked grey to gold with a burst of sparks and a ring pulse, and a shine
 * sweeps across. One at a time; several unlocks play in turn.
 */
export function AchievementCelebration({ queue, onDone }: { queue: AchievementStatus[]; onDone: () => void }) {
  const current = queue[0]

  useEffect(() => {
    if (!current) return
    const t = window.setTimeout(onDone, SHOW_MS)
    return () => window.clearTimeout(t)
  }, [current, onDone])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))]" aria-live="polite">
      <AnimatePresence mode="wait">
        {current && <Celebration key={current.id} a={current} onDismiss={onDone} more={queue.length - 1} />}
      </AnimatePresence>
    </div>
  )
}

function Celebration({ a, onDismiss, more }: { a: AchievementStatus; onDismiss: () => void; more: number }) {
  const reduce = useReducedMotion()
  useEffect(() => haptic('success'), [])

  return (
    <motion.button
      type="button"
      onClick={onDismiss}
      aria-label={`Achievement unlocked: ${a.name}. ${a.description} Dismiss.`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="pointer-events-auto relative flex w-full max-w-sm items-center gap-4 overflow-hidden rounded-2xl border border-gold/50 bg-surface p-4 text-left shadow-2xl shadow-black/50"
    >
      {/* Shine sweeping across the card. */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#f0d58f]/25 to-transparent"
          initial={{ left: '-40%' }}
          animate={{ left: '120%' }}
          transition={{ delay: 0.55, duration: 0.9, ease: 'easeInOut' }}
        />
      )}

      <Medal a={a} reduce={!!reduce} />

      <span className="relative grid min-w-0 gap-0.5">
        <motion.span
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold"
        >
          Achievement unlocked
        </motion.span>
        <motion.span
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="font-display text-lg font-bold leading-tight"
        >
          {a.name}
        </motion.span>
        <motion.span
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xs text-muted"
        >
          {a.description}
          {more > 0 && ` · ${more} more`}
        </motion.span>
      </span>

      {/* Time left before it closes by itself. */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 bg-gold/60"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: SHOW_MS / 1000, ease: 'linear' }}
        />
      )}
    </motion.button>
  )
}

function Medal({ a, reduce }: { a: AchievementStatus; reduce: boolean }) {
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      {!reduce && (
        <>
          {/* Ring pulse. */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: GOLD }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.9], opacity: [0, 0.7, 0] }}
            transition={{ delay: 0.32, duration: 0.8, ease: 'easeOut' }}
          />
          {/* Sparks bursting outward. */}
          {Array.from({ length: SPARKS }, (_, i) => {
            const angle = (i / SPARKS) * Math.PI * 2
            const dist = 34 + (i % 3) * 7
            return (
              <motion.span
                key={i}
                aria-hidden
                className="absolute size-1.5 rounded-full"
                style={{ background: i % 2 ? GOLD : '#f0d58f' }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: [0, 1, 0], scale: [0.4, 1, 0.3] }}
                transition={{ delay: 0.3, duration: 0.75, ease: 'easeOut' }}
              />
            )
          })}
        </>
      )}
      {/* The medal: locked grey, then it pops and turns gold. */}
      <motion.span
        className="relative grid size-14 place-items-center overflow-hidden rounded-full text-[#0f1412] shadow-lg shadow-[#d4b062]/40"
        style={{ background: 'radial-gradient(circle at 30% 30%, #5d6661, #353d39)' }}
        initial={reduce ? false : { scale: 0.5, rotate: -25 }}
        animate={{ scale: reduce ? 1 : [0.5, 1.18, 1], rotate: 0 }}
        transition={{ duration: 0.6, times: [0, 0.6, 1], ease: 'easeOut' }}
      >
        {/* Gradients can't be tweened, so the gold is a layer that fades in over the grey. */}
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 30% 30%, #f0d58f, #b08a3e)' }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        />
        <span className="relative">
          <AchievementGlyph icon={a.icon} size={26} />
        </span>
      </motion.span>
    </span>
  )
}
