/**
 * Money is always stored and summed as integer cents (minor units) so totals
 * never drift from floating-point error. Conversion to a decimal happens only
 * at the edges: parsing user input and formatting for display/export.
 */
export type Cents = number

/** Largest absolute amount we accept for a single value: 1 billion. */
export const MAX_ABS_CENTS = 100_000_000_000

export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'CHF', label: 'Swiss Franc' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value)
}

/**
 * Parse text such as "50", "+$50.25", "-25", "1,250.5" or "$0" into cents.
 * Returns null when the text is not a valid amount with at most 2 decimals.
 * Parsing is done on the digit string, never by multiplying a float.
 */
export function parseMoney(input: string): Cents | null {
  const cleaned = input.replace(/[\s,$€£₹]/g, '')
  const match = /^([+-])?(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned)
  if (!match) return null
  const [, sign, whole = '', frac = ''] = match
  if (whole === '' && frac === '') return null
  if (whole.length > 12) return null
  const cents = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > MAX_ABS_CENTS) return null
  return sign === '-' && cents !== 0 ? -cents : cents
}

/** Exact decimal string for a cents value, e.g. -2505 -> "-25.05". */
export function centsToDecimalString(cents: Cents): string {
  assertCents(cents)
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${cents < 0 ? '-' : ''}${whole}.${frac}`
}

/** Sum cents values exactly. Throws if a value is not an integer. */
export function sumCents(values: readonly Cents[]): Cents {
  let total = 0
  for (const v of values) {
    assertCents(v)
    total += v
  }
  return total
}

/** Divide cents and round half away from zero, e.g. average per session. */
export function divideCents(total: Cents, divisor: number): Cents {
  if (divisor === 0) throw new RangeError('Cannot divide by zero')
  const q = total / divisor
  const r = Math.round(Math.abs(q))
  return q < 0 ? -r : r
}

export interface FormatOptions {
  /** Show "+" for positive amounts (zero never gets a sign). */
  signed?: boolean
  /** Drop the cents when the amount is a whole number. */
  trimWhole?: boolean
  /** Short form such as "$1.2K" for chart axes. */
  compact?: boolean
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: CurrencyCode, opts: FormatOptions, fractionDigits: number) {
  const key = `${currency}|${opts.signed ? 1 : 0}|${opts.compact ? 1 : 0}|${fractionDigits}`
  let f = formatterCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      signDisplay: opts.signed ? 'exceptZero' : 'auto',
      notation: opts.compact ? 'compact' : 'standard',
      minimumFractionDigits: opts.compact ? 0 : fractionDigits,
      maximumFractionDigits: opts.compact ? 1 : fractionDigits,
    })
    formatterCache.set(key, f)
  }
  return f
}

export function formatMoney(cents: Cents, currency: CurrencyCode = 'USD', opts: FormatOptions = {}): string {
  assertCents(cents)
  const digits = opts.trimWhole && cents % 100 === 0 ? 0 : 2
  // cents / 100 is only used for display; Intl rounds it to the same 2 digits.
  return getFormatter(currency, opts, digits).format(cents / 100)
}

function assertCents(v: number) {
  if (!Number.isSafeInteger(v)) throw new TypeError(`Expected integer cents, got ${v}`)
}
