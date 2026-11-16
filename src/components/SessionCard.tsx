import type { Session } from '../domain/session'
import { formatDuration } from '../lib/dates'
import { useSessions } from '../state/SessionsProvider'
import { ClockIcon } from './icons'
import { cx, MoneyText } from './ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function SessionCard({ session, onClick, compact }: { session: Session; onClick: () => void; compact?: boolean }) {
  const { today } = useSessions()
  const [y, m, d] = session.date.split('-').map(Number)
  const tone = session.netCents > 0 ? 'bg-pos' : session.netCents < 0 ? 'bg-neg' : 'bg-even'
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-muted/50"
    >
      <span className="sr-only">
        Edit session on {MONTHS[m - 1]} {d}, {y}:
      </span>
      <div aria-hidden className="relative grid w-12 shrink-0 justify-items-center rounded-xl bg-surface-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{MONTHS[m - 1]}</span>
        <span className="text-lg font-bold leading-tight tabular">{d}</span>
        <span className={cx('absolute -left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full', tone)} aria-hidden />
      </div>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="truncate">{session.gameType ?? 'Session'}</span>
          {session.durationMinutes && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
              <ClockIcon width={13} height={13} />
              {formatDuration(session.durationMinutes)}
            </span>
          )}
        </div>
        {!compact && (
          <span className="truncate text-xs text-muted">{session.notes ?? (String(y) !== today.slice(0, 4) ? String(y) : 'No notes')}</span>
        )}
      </div>
      <MoneyText cents={session.netCents} className="shrink-0 text-base font-bold" />
    </button>
  )
}
