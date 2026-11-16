/**
 * Session dates are calendar days stored as "YYYY-MM-DD" strings. They have no
 * time zone, so they sort correctly as strings and never shift by a day.
 */
export type IsoDate = string

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false
  const m = ISO_DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

/** Today's date in the user's local time zone. */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function toIso(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function toUtc(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const dt = toUtc(iso)
  dt.setUTCDate(dt.getUTCDate() + days)
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** Day of week, 0 = Sunday. */
export function dayOfWeek(iso: IsoDate): number {
  return toUtc(iso).getUTCDay()
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** "2026-11" for a date. */
export function monthKey(iso: IsoDate): string {
  return iso.slice(0, 7)
}

export function yearOf(iso: IsoDate): number {
  return Number(iso.slice(0, 4))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "Nov 15, 2026" */
export function formatDate(iso: IsoDate, opts: { withYear?: boolean } = { withYear: true }): string {
  const [y, m, d] = iso.split('-').map(Number)
  return opts.withYear === false ? `${MONTHS[m - 1]} ${d}` : `${MONTHS[m - 1]} ${d}, ${y}`
}

/** "Nov 2026" or "November 2026" for a "YYYY-MM" key. */
export function formatMonth(key: string, long = false): string {
  const [y, m] = key.split('-').map(Number)
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
