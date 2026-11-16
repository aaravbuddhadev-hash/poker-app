import { motion } from 'motion/react'
import type { AchievementIcon, AchievementStatus } from '../achievements/achievements'
import { cx } from './ui'

const PATHS: Record<AchievementIcon, string> = {
  book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h9',
  cap: 'M2 9l10-5 10 5-10 5L2 9Zm4 2v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5',
  spark: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
  stack: 'M4 7l8-4 8 4-8 4-8-4Zm0 5l8 4 8-4M4 17l8 4 8-4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  puzzle: 'M4 9h4V7a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4H4V9Z',
  flame: 'M12 21c4 0 7-2.8 7-6.5 0-3.6-2.5-5.3-3.5-8.5-1.8 1.5-2.5 3.3-2.5 5-1.5-1-2.5-2.8-2.5-5C7 8 5 11 5 14.5 5 18.2 8 21 12 21Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
}

export function AchievementBadge({ a }: { a: AchievementStatus }) {
  return (
    <div
      className={cx('grid content-start gap-2 rounded-2xl border p-3', a.unlocked ? 'border-gold/40 bg-surface' : 'border-line bg-surface/60')}
      aria-label={`${a.name}: ${a.unlocked ? 'unlocked' : `${a.current} of ${a.target}`}`}
    >
      <motion.span
        initial={a.unlocked ? { scale: 0.6, rotate: -12 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className={cx(
          'grid size-11 place-items-center rounded-full',
          a.unlocked ? 'bg-[radial-gradient(circle_at_30%_30%,#f0d58f,#b08a3e)] text-[#0f1412] shadow-md shadow-[#d4b062]/30' : 'bg-surface-2 text-muted',
        )}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={PATHS[a.icon]} />
        </svg>
      </motion.span>
      <span className={cx('text-sm font-semibold', !a.unlocked && 'text-muted')}>{a.name}</span>
      <span className="text-xs text-muted">{a.description}</span>
      {!a.unlocked && a.target > 1 && (
        <span className="grid gap-1">
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-emerald" style={{ width: `${(a.current / a.target) * 100}%` }} />
          </span>
          <span className="text-[11px] text-muted tabular">
            {a.current} / {a.target}
          </span>
        </span>
      )}
    </div>
  )
}
