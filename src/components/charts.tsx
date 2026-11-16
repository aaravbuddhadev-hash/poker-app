import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cumulativeSeries, monthlyTotals, type Summary } from '../domain/analytics'
import type { Session } from '../domain/session'
import { formatDate, formatMonth } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useSettings } from '../state/SettingsProvider'
import { useChartColors } from './theme'

function TooltipBox({ title, rows }: { title: string; rows: [string, string, string?][] }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs shadow-lg shadow-black/30">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map(([k, v, color]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted">{k}</span>
          <span className="tabular font-semibold" style={{ color }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Running total of net results over the given sessions. */
export function CumulativeChart({ sessions, height = 220 }: { sessions: readonly Session[]; height?: number }) {
  const c = useChartColors()
  const { currency } = useSettings().settings
  const data = useMemo(() => {
    const series = cumulativeSeries(sessions)
    if (series.length === 0) return []
    // Start from zero so the first session's result is visible as a change.
    return [{ date: series[0].date, label: 'Start', cumulativeCents: 0, dayCents: 0, sessions: 0 }, ...series.map((p) => ({ ...p, label: formatDate(p.date, { withYear: false }) }))]
  }, [sessions])

  const last = data.at(-1)?.cumulativeCents ?? 0
  const stroke = last >= 0 ? c.pos : c.neg
  const gid = last >= 0 ? 'cum-pos' : 'cum-neg'

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.line} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} interval="preserveStartEnd" />
          <YAxis
            tick={{ fill: c.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => formatMoney(Math.round(v), currency, { compact: true })}
          />
          <ReferenceLine y={0} stroke={c.muted} strokeOpacity={0.5} />
          <Tooltip
            cursor={{ stroke: c.muted, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined
              if (!active || !p || p.label === 'Start') return null
              return (
                <TooltipBox
                  title={formatDate(p.date)}
                  rows={[
                    ['Day', formatMoney(p.dayCents, currency, { signed: true }), p.dayCents >= 0 ? c.pos : c.neg],
                    ['Running total', formatMoney(p.cumulativeCents, currency, { signed: true })],
                    ['Sessions', String(p.sessions)],
                  ]}
                />
              )
            }}
          />
          <Area type="monotone" dataKey="cumulativeCents" stroke={stroke} strokeWidth={2.25} fill={`url(#${gid})`} activeDot={{ r: 4, fill: stroke, stroke: c.surface, strokeWidth: 2 }} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Net result per month for the last `months` months that have sessions. */
export function MonthlyChart({ sessions, months = 12, height = 220 }: { sessions: readonly Session[]; months?: number; height?: number }) {
  const c = useChartColors()
  const { currency } = useSettings().settings
  const data = useMemo(
    () => monthlyTotals(sessions).slice(-months).map((m) => ({ ...m, label: formatMonth(m.month).replace(/ \d{2}(\d{2})$/, " '$1") })),
    [sessions, months],
  )
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.line} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatMoney(Math.round(v), currency, { compact: true })} />
          <ReferenceLine y={0} stroke={c.muted} strokeOpacity={0.5} />
          <Tooltip
            cursor={{ fill: c.line, fillOpacity: 0.4 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined
              if (!active || !p) return null
              return (
                <TooltipBox
                  title={formatMonth(p.month, true)}
                  rows={[
                    ['Net', formatMoney(p.netCents, currency, { signed: true }), p.netCents >= 0 ? c.pos : c.neg],
                    ['Sessions', String(p.count)],
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="netCents" radius={[6, 6, 6, 6]} maxBarSize={36}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.netCents > 0 ? c.pos : d.netCents < 0 ? c.neg : c.even} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Share of positive, negative and break-even sessions. */
export function OutcomeDonut({ summary }: { summary: Summary }) {
  const c = useChartColors()
  const data = [
    { key: 'Positive', value: summary.positive, color: c.pos },
    { key: 'Negative', value: summary.negative, color: c.neg },
    { key: 'Break-even', value: summary.even, color: c.even },
  ]
  const pct = (n: number) => (summary.count ? `${Math.round((n / summary.count) * 100)}%` : '0%')
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="key" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270} isAnimationActive>
              {data.filter((d) => d.value > 0).map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-bold tabular">{pct(summary.positive)}</span>
          <span className="text-[11px] text-muted">positive</span>
        </div>
      </div>
      <ul className="grid gap-2 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="w-24">{d.key}</span>
            <span className="tabular font-semibold">{d.value}</span>
            <span className="tabular text-muted">({pct(d.value)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
