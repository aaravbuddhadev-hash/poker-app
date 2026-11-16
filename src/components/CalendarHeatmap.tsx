import { useMemo } from 'react'
import { dailyTotals } from '../domain/analytics'
import type { Session } from '../domain/session'
import { addDays, dayOfWeek, formatDate, toIso } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useSettings } from '../state/SettingsProvider'
import { useChartColors } from './theme'

const CELL = 12
const GAP = 3
const LEFT = 26
const TOP = 18
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** GitHub-style year grid: one square per day, colored by that day's net result. */
export function CalendarHeatmap({ sessions, year, today }: { sessions: readonly Session[]; year: number; today: string }) {
  const c = useChartColors()
  const { currency } = useSettings().settings

  const { cells, weeks, monthLabels, maxAbs } = useMemo(() => {
    const totals = dailyTotals(sessions)
    const first = toIso(year, 1, 1)
    const gridStart = addDays(first, -dayOfWeek(first)) // Sunday on or before Jan 1
    const out: { date: string; x: number; y: number; count: number; net: number }[] = []
    const labels: { x: number; label: string }[] = []
    let maxAbs = 0
    let w = 0
    for (let day = gridStart; day <= toIso(year, 12, 31); day = addDays(day, 1)) {
      const dow = dayOfWeek(day)
      if (dow === 0 && day !== gridStart) w++
      if (!day.startsWith(String(year))) continue
      if (day.endsWith('-01')) labels.push({ x: w, label: MONTHS[Number(day.slice(5, 7)) - 1] })
      const t = totals.get(day)
      if (t) maxAbs = Math.max(maxAbs, Math.abs(t.netCents))
      out.push({ date: day, x: w, y: dow, count: t?.count ?? 0, net: t?.netCents ?? 0 })
    }
    return { cells: out, weeks: w + 1, monthLabels: labels, maxAbs }
  }, [sessions, year])

  const width = LEFT + weeks * (CELL + GAP)
  const height = TOP + 7 * (CELL + GAP)

  function fill(count: number, net: number): [string, number] {
    if (count === 0) return [c.empty, 1]
    if (net === 0) return [c.even, 0.85]
    // Four intensity steps by size of the result relative to the biggest day.
    const level = maxAbs ? Math.min(3, Math.floor((Math.abs(net) / maxAbs) * 4)) : 3
    return [net > 0 ? c.pos : c.neg, [0.4, 0.6, 0.8, 1][level]]
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <svg width={width} height={height} role="img" aria-label={`Sessions recorded in ${year}`} className="block">
          {monthLabels.map((m) => (
            <text key={m.label} x={LEFT + m.x * (CELL + GAP)} y={11} fontSize={10} fill={c.muted}>
              {m.label}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} x={0} y={TOP + (i * 2 + 1) * (CELL + GAP) + CELL - 2} fontSize={9} fill={c.muted}>
              {d}
            </text>
          ))}
          {cells.map((cell) => {
            const [color, opacity] = fill(cell.count, cell.net)
            const future = cell.date > today
            return (
              <rect
                key={cell.date}
                x={LEFT + cell.x * (CELL + GAP)}
                y={TOP + cell.y * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                fill={color}
                fillOpacity={future ? 0.35 : opacity}
              >
                <title>
                  {cell.count
                    ? `${formatDate(cell.date)}: ${cell.count} session${cell.count > 1 ? 's' : ''}, ${formatMoney(cell.net, currency, { signed: true })}`
                    : `${formatDate(cell.date)}: no sessions`}
                </title>
              </rect>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-[3px]" style={{ background: c.pos }} />Positive day</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-[3px]" style={{ background: c.neg }} />Negative day</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-[3px]" style={{ background: c.even }} />Break-even</span>
        <span>Darker = bigger result</span>
      </div>
    </div>
  )
}
