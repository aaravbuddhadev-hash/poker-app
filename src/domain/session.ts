import { isIsoDate, type IsoDate } from '../lib/dates'
import { MAX_ABS_CENTS, type Cents } from '../lib/money'

export const GAME_TYPES = [
  "No-Limit Hold'em",
  "Limit Hold'em",
  'Pot-Limit Omaha',
  'Tournament',
  'Sit & Go',
  'Home Game',
  'Other',
] as const

export type GameType = (typeof GAME_TYPES)[number]

export function isGameType(v: unknown): v is GameType {
  return GAME_TYPES.includes(v as GameType)
}

/**
 * "simple": the user typed the net result directly.
 * "detailed": the user recorded starting and ending amounts and the net was
 * calculated as end - start. These are amounts the user writes down for their
 * own records; the app never moves money.
 */
export type EntryMode = 'simple' | 'detailed'

export interface SessionInput {
  date: IsoDate
  mode: EntryMode
  netCents: Cents
  startCents?: Cents
  endCents?: Cents
  durationMinutes?: number
  gameType?: GameType
  notes?: string
}

export interface Session extends SessionInput {
  id: string
  createdAt: string
  updatedAt: string
}

export const MAX_DURATION_MINUTES = 48 * 60
export const MAX_NOTES_LENGTH = 2000

export type SessionErrors = Partial<Record<keyof SessionInput, string>>

export type ValidationResult = { ok: true; value: SessionInput } | { ok: false; errors: SessionErrors }

/**
 * Validate and normalize a session. In detailed mode the net result is always
 * recomputed from the start and end amounts, so it can never disagree with them.
 */
export function validateSessionInput(input: SessionInput, today: IsoDate): ValidationResult {
  const errors: SessionErrors = {}

  if (!isIsoDate(input.date)) errors.date = 'Enter a valid date.'
  else if (input.date > today) errors.date = "Session date can't be in the future."

  let netCents = input.netCents
  let startCents: Cents | undefined
  let endCents: Cents | undefined

  if (input.mode === 'detailed') {
    if (!isNonNegativeCents(input.startCents)) errors.startCents = 'Enter the amount you started with.'
    if (!isNonNegativeCents(input.endCents)) errors.endCents = 'Enter the amount you ended with.'
    if (isNonNegativeCents(input.startCents) && isNonNegativeCents(input.endCents)) {
      startCents = input.startCents
      endCents = input.endCents
      netCents = endCents - startCents
    }
  } else if (input.mode !== 'simple') {
    errors.mode = 'Choose an entry mode.'
  }

  if (!Number.isSafeInteger(netCents) || Math.abs(netCents) > MAX_ABS_CENTS) {
    errors.netCents ??= 'Enter a valid net result.'
  }

  let durationMinutes: number | undefined
  if (input.durationMinutes !== undefined) {
    const d = input.durationMinutes
    if (!Number.isInteger(d) || d <= 0 || d > MAX_DURATION_MINUTES) {
      errors.durationMinutes = 'Duration must be between 1 minute and 48 hours.'
    } else durationMinutes = d
  }

  if (input.gameType !== undefined && !isGameType(input.gameType)) errors.gameType = 'Choose a game type.'

  const notes = input.notes?.trim()
  if (notes && notes.length > MAX_NOTES_LENGTH) errors.notes = `Notes can be up to ${MAX_NOTES_LENGTH} characters.`

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const value: SessionInput = { date: input.date, mode: input.mode, netCents }
  if (input.mode === 'detailed') {
    value.startCents = startCents
    value.endCents = endCents
  }
  if (durationMinutes !== undefined) value.durationMinutes = durationMinutes
  if (input.gameType) value.gameType = input.gameType
  if (notes) value.notes = notes
  return { ok: true, value }
}

function isNonNegativeCents(v: unknown): v is Cents {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= MAX_ABS_CENTS
}

/** Runtime check for records read back from storage. */
export function isSession(v: unknown): v is Session {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    isIsoDate(s.date) &&
    (s.mode === 'simple' || s.mode === 'detailed') &&
    typeof s.netCents === 'number' &&
    Number.isSafeInteger(s.netCents) &&
    typeof s.createdAt === 'string' &&
    typeof s.updatedAt === 'string' &&
    (s.durationMinutes === undefined || typeof s.durationMinutes === 'number') &&
    (s.gameType === undefined || isGameType(s.gameType)) &&
    (s.notes === undefined || typeof s.notes === 'string')
  )
}
