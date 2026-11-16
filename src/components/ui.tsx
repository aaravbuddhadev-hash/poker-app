import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { outcomeOf } from '../domain/analytics'
import { formatMoney, type Cents } from '../lib/money'
import { useSettings } from '../state/SettingsProvider'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1 min-w-0">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Card({ className, children, title, action }: { className?: string; children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface p-4 md:p-5 min-w-0', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
        size === 'md' ? 'h-11 px-5 text-sm' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-emerald text-on-accent hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface-2 hover:border-muted/60',
        variant === 'ghost' && 'text-muted hover:text-fg hover:bg-surface-2',
        variant === 'danger' && 'bg-neg text-white hover:brightness-110',
        className,
      )}
    />
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-full border border-line bg-surface-2 p-1 gap-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 flex-1 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors',
            value === o.value ? 'bg-emerald text-on-accent' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const inputCls =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-muted/70 focus:border-emerald focus:outline-none aria-[invalid=true]:border-neg'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5 min-w-0">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-neg">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

const toneCls = { positive: 'text-pos', negative: 'text-neg', even: 'text-even' } as const

/** A money amount colored green, red or neutral by its sign. */
export function MoneyText({
  cents,
  signed = true,
  className,
  compact,
}: {
  cents: Cents
  signed?: boolean
  className?: string
  compact?: boolean
}) {
  const { currency } = useSettings().settings
  return (
    <span className={cx('tabular', toneCls[outcomeOf(cents)], className)}>
      {formatMoney(cents, currency, { signed, compact })}
    </span>
  )
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 grid gap-1 content-start min-w-0">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className="text-xl font-bold tabular truncate">{value}</span>
      {sub && <span className="text-xs text-muted truncate">{sub}</span>}
    </div>
  )
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-6 md:p-8 grid gap-3 justify-items-center text-center">
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="text-sm text-muted max-w-sm">{body}</p>
      {children && <div className="flex flex-wrap justify-center gap-2 pt-1">{children}</div>}
    </div>
  )
}

/** Placeholder while a screen's code downloads: the shape of a page, gently pulsing. */
export function PageLoading({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div role="status" aria-label="Loading" className={cx('grid gap-4', fullScreen && 'min-h-dvh place-content-center bg-bg p-6')}>
      {fullScreen ? (
        <div className="size-10 animate-spin rounded-full border-2 border-line border-t-emerald" />
      ) : (
        <>
          <div className="h-9 w-48 animate-pulse rounded-xl bg-surface" />
          <div className="h-40 animate-pulse rounded-3xl bg-surface" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
