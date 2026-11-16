import { useMemo } from 'react'
import { dailyTotals } from '../domain/analytics'
import type { Session } from '../domain/session'
import { daysInMonth, dayOfWeek, formatMonth, toIso } from '../lib/dates'
import { ChevronLeft, ChevronRight } from './icons'
import { cx, MoneyText } from './ui'

interface Props {
  sessions: readonly Session[]
  month: string // "YYYY-MM"
  onMonthChange: (month: string) => void
  selected: string | null
  onSelect: (date: string) => void
  today: string
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function MonthCalendar({ sessions, month, onMonthChange, selected, onSelect, today }: Props) {
  const totals = useMemo(() => dailyTotals(sessions), [sessions])
  const [y, m] = month.split('-').map(Number)
  const lead = dayOfWeek(toIso(y, m, 1))
  const days = daysInMonth(y, m)
  const monthNet = [...totals.entries()].filter(([d]) => d.startsWith(month)).reduce((a, [, t]) => a + t.netCents, 0)
  const monthCount = [...totals.entries()].filter(([d]) => d.startsWith(month)).reduce((a, [, t]) => a + t.count, 0)

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-surface-2" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="Previous month">
          <ChevronLeft />
        </button>
        <div className="grid text-center">
          <span className="font-display text-lg font-bold">{formatMonth(month, true)}</span>
          <span className="text-xs text-muted">
            {monthCount} session{monthCount === 1 ? '' : 's'} · <MoneyText cents={monthNet} />
          </span>
        </div>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          disabled={month >= today.slice(0, 7)}
          aria-label="Next month"
        >
          <ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = toIso(y, m, i + 1)
          const t = totals.get(date)
          const isSel = selected === date
          const tone = !t ? '' : t.netCents > 0 ? 'bg-pos/15 border-pos/40' : t.netCents < 0 ? 'bg-neg/15 border-neg/40' : 'bg-even/15 border-even/40'
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              disabled={date > today}
              aria-pressed={isSel}
              aria-label={`${date}${t ? `, ${t.count} session${t.count > 1 ? 's' : ''}` : ''}`}
              className={cx(
                'relative grid aspect-square min-h-11 content-center justify-items-center rounded-xl border border-transparent text-sm transition-colors disabled:opacity-30',
                tone,
                isSel ? 'ring-2 ring-gold' : 'hover:border-line',
                date === today && 'font-bold underline decoration-gold decoration-2 underline-offset-4',
              )}
            >
              <span className="tabular">{i + 1}</span>
              {t && <MoneyText cents={t.netCents} compact className="hidden sm:block text-[10px] font-semibold leading-tight" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
