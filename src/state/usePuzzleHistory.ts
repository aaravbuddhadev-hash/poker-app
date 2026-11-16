import { useCallback, useState } from 'react'
import { getBrowserStore } from '../data/sessionRepository'
import { isIsoDate } from '../lib/dates'
import type { Submission } from '../puzzle/scoring'

/** Shape: { submissions: { "2026-11-15": Submission, ... } }, keyed by UTC puzzle date. */
export const PUZZLES_KEY = 'river.v1.puzzles'

function isSubmission(v: unknown): v is Submission {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  const nums = (x: unknown) => Array.isArray(x) && x.every((n) => typeof n === 'number' && Number.isFinite(n))
  return (
    (s.kind === 'preflop' || s.kind === 'flop' || s.kind === 'turn') &&
    typeof s.players === 'number' &&
    nums(s.prediction) &&
    nums(s.equity) &&
    nums(s.win) &&
    nums(s.tie) &&
    typeof s.accuracy === 'number' &&
    typeof s.submittedAt === 'string'
  )
}

function load(): Record<string, Submission> {
  try {
    const raw = getBrowserStore().getItem(PUZZLES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { submissions?: Record<string, unknown> }
    const out: Record<string, Submission> = {}
    for (const [date, s] of Object.entries(parsed.submissions ?? {})) if (isIsoDate(date) && isSubmission(s)) out[date] = s
    return out
  } catch {
    return {}
  }
}

/** Puzzle answers saved on this device. One submission per UTC date; it can't be changed later. */
export function usePuzzleHistory() {
  const [submissions, setSubmissions] = useState<Record<string, Submission>>(load)

  const save = useCallback((date: string, submission: Submission) => {
    setSubmissions((prev) => {
      if (prev[date]) return prev // first answer counts
      const next = { ...prev, [date]: submission }
      try {
        getBrowserStore().setItem(PUZZLES_KEY, JSON.stringify({ submissions: next }))
      } catch {
        // Storage blocked: the result still shows for this visit.
      }
      return next
    })
  }, [])

  return { submissions, save }
}
