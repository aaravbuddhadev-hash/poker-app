import type { Session } from '../domain/session'
import { centsToDecimalString } from './money'

export const CSV_HEADER = ['Date', 'Net Result', 'Game Type', 'Duration (minutes)', 'Notes'] as const

/**
 * Quote a cell for CSV. Text that starts with = + - @ is prefixed with an
 * apostrophe so spreadsheet apps don't run it as a formula (CSV injection).
 */
export function csvCell(value: string, { isText = true } = {}): string {
  let v = value
  if (isText && /^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function sessionsToCsv(sessions: readonly Session[]): string {
  const rows = sessions.map((s) =>
    [
      csvCell(s.date, { isText: false }),
      csvCell(centsToDecimalString(s.netCents), { isText: false }),
      csvCell(s.gameType ?? ''),
      csvCell(s.durationMinutes ? String(s.durationMinutes) : '', { isText: false }),
      csvCell(s.notes ?? ''),
    ].join(','),
  )
  return [CSV_HEADER.join(','), ...rows].join('\r\n') + '\r\n'
}
