import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { GAME_TYPES, MAX_NOTES_LENGTH, type EntryMode, type GameType, type Session, type SessionErrors } from '../domain/session'
import { centsToDecimalString, parseMoney } from '../lib/money'
import { useSessions } from '../state/SessionsProvider'
import { CloseIcon } from './icons'
import { Button, Field, inputCls, MoneyText, Segmented } from './ui'

type Outcome = 'won' | 'lost' | 'even'

interface FormState {
  date: string
  mode: EntryMode
  outcome: Outcome
  amount: string
  start: string
  end: string
  hours: string
  minutes: string
  gameType: GameType | ''
  notes: string
}

function initialState(today: string, s?: Session): FormState {
  if (!s) {
    return { date: today, mode: 'simple', outcome: 'won', amount: '', start: '', end: '', hours: '', minutes: '', gameType: '', notes: '' }
  }
  const d = s.durationMinutes
  return {
    date: s.date,
    mode: s.mode,
    outcome: s.netCents > 0 ? 'won' : s.netCents < 0 ? 'lost' : 'even',
    amount: s.netCents === 0 ? '' : centsToDecimalString(Math.abs(s.netCents)),
    start: s.startCents !== undefined ? centsToDecimalString(s.startCents) : '',
    end: s.endCents !== undefined ? centsToDecimalString(s.endCents) : '',
    hours: d ? String(Math.floor(d / 60)) : '',
    minutes: d ? String(d % 60) : '',
    gameType: s.gameType ?? '',
    notes: s.notes ?? '',
  }
}

/** Unsigned amount: the sign comes from the Won/Lost choice. */
function parseUnsigned(text: string): number | null {
  const v = parseMoney(text)
  return v === null || v < 0 || /^\s*[+-]/.test(text) ? null : v
}

export function SessionForm({ session, initialDate, onClose }: { session?: Session; initialDate?: string; onClose: () => void }) {
  const { today, create, update, remove, isDemo } = useSessions()
  const [f, setF] = useState<FormState>(() => initialState(initialDate && initialDate <= today ? initialDate : today, session))
  const [errors, setErrors] = useState<SessionErrors & { amount?: string }>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const id = useId()
  const firstField = useRef<HTMLInputElement>(null)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    firstField.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Live net result preview.
  let previewCents: number | null = null
  if (f.mode === 'simple') {
    if (f.outcome === 'even') previewCents = 0
    else {
      const a = parseUnsigned(f.amount)
      if (a !== null) previewCents = f.outcome === 'lost' ? -a : a
    }
  } else {
    const s = parseUnsigned(f.start)
    const e = parseUnsigned(f.end)
    if (s !== null && e !== null) previewCents = e - s
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const local: typeof errors = {}

    let netCents = 0
    let startCents: number | undefined
    let endCents: number | undefined
    if (f.mode === 'simple') {
      if (f.outcome !== 'even') {
        const a = parseUnsigned(f.amount)
        if (a === null || a === 0) local.amount = 'Enter an amount like 50 or 25.50, without a + or - sign.'
        else netCents = f.outcome === 'lost' ? -a : a
      }
    } else {
      const s = parseUnsigned(f.start)
      const en = parseUnsigned(f.end)
      if (s === null) local.startCents = 'Enter the amount you started with, like 200.'
      if (en === null) local.endCents = 'Enter the amount you ended with, like 135.50.'
      if (s !== null && en !== null) {
        startCents = s
        endCents = en
        netCents = en - s
      }
    }

    let durationMinutes: number | undefined
    if (f.hours.trim() || f.minutes.trim()) {
      const h = Number(f.hours || 0)
      const m = Number(f.minutes || 0)
      if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59) {
        local.durationMinutes = 'Use whole hours and 0–59 minutes.'
      } else durationMinutes = h * 60 + m
    }

    if (Object.keys(local).length) {
      setErrors(local)
      return
    }

    setSaving(true)
    const input = {
      date: f.date,
      mode: f.mode,
      netCents,
      startCents,
      endCents,
      durationMinutes,
      gameType: f.gameType || undefined,
      notes: f.notes,
    }
    const result = session ? await update(session.id, input) : await create(input)
    setSaving(false)
    if (result.ok) onClose()
    else setErrors(result.errors)
  }

  const err = (k: keyof typeof errors) => errors[k]
  const aria = (k: keyof typeof errors, fieldId: string) =>
    err(k) ? { 'aria-invalid': true as const, 'aria-describedby': `${fieldId}-error` } : {}

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onSubmit={onSubmit}
        noValidate
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative w-full md:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-line bg-surface shadow-2xl shadow-black/40"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <div className="grid">
            <h2 id={`${id}-title`} className="font-display text-xl font-bold">
              {session ? 'Edit session' : 'Add session'}
            </h2>
            {isDemo && <span className="text-xs text-gold">Demo mode: changes only affect demo data</span>}
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" htmlFor={`${id}-date`} error={err('date')}>
              <input ref={firstField} id={`${id}-date`} type="date" max={today} required value={f.date} onChange={(e) => set('date', e.target.value)} className={inputCls} {...aria('date', `${id}-date`)} />
            </Field>
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted">How do you want to record it?</span>
              <Segmented
                label="Entry mode"
                value={f.mode}
                onChange={(v) => set('mode', v)}
                options={[
                  { value: 'simple', label: 'Net result' },
                  { value: 'detailed', label: 'Start & end' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          {f.mode === 'simple' ? (
            <div className="grid gap-3">
              <Segmented
                label="Result"
                value={f.outcome}
                onChange={(v) => set('outcome', v)}
                options={[
                  { value: 'won', label: 'Up' },
                  { value: 'lost', label: 'Down' },
                  { value: 'even', label: 'Broke even' },
                ]}
                className="w-full"
              />
              {f.outcome !== 'even' && (
                <Field label={f.outcome === 'won' ? 'Amount up' : 'Amount down'} htmlFor={`${id}-amount`} error={err('amount') ?? err('netCents')}>
                  <input id={`${id}-amount`} inputMode="decimal" autoComplete="off" placeholder="50.00" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} {...aria('amount', `${id}-amount`)} />
                </Field>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Starting amount" htmlFor={`${id}-start`} error={err('startCents')}>
                  <input id={`${id}-start`} inputMode="decimal" autoComplete="off" placeholder="200.00" value={f.start} onChange={(e) => set('start', e.target.value)} className={inputCls} {...aria('startCents', `${id}-start`)} />
                </Field>
                <Field label="Ending amount" htmlFor={`${id}-end`} error={err('endCents')}>
                  <input id={`${id}-end`} inputMode="decimal" autoComplete="off" placeholder="135.50" value={f.end} onChange={(e) => set('end', e.target.value)} className={inputCls} {...aria('endCents', `${id}-end`)} />
                </Field>
              </div>
              <p className="text-xs text-muted">Amounts you had at the start and end of the session, recorded for your own notes.</p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted">Net result</span>
            {previewCents === null ? (
              <span className="text-lg font-bold text-muted">—</span>
            ) : (
              <MoneyText cents={previewCents} className="text-lg font-bold" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Duration (optional)" htmlFor={`${id}-hours`} error={err('durationMinutes')}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input id={`${id}-hours`} inputMode="numeric" placeholder="0" value={f.hours} onChange={(e) => set('hours', e.target.value.replace(/\D/g, '').slice(0, 2))} className={`${inputCls} pr-8`} {...aria('durationMinutes', `${id}-hours`)} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">h</span>
                </div>
                <div className="relative flex-1">
                  <input aria-label="Minutes" inputMode="numeric" placeholder="0" value={f.minutes} onChange={(e) => set('minutes', e.target.value.replace(/\D/g, '').slice(0, 2))} className={`${inputCls} pr-8`} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">m</span>
                </div>
              </div>
            </Field>
            <Field label="Game type (optional)" htmlFor={`${id}-game`} error={err('gameType')}>
              <select id={`${id}-game`} value={f.gameType} onChange={(e) => set('gameType', e.target.value as GameType | '')} className={inputCls}>
                <option value="">Not specified</option>
                {GAME_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes (optional)" htmlFor={`${id}-notes`} error={err('notes')} hint={`${f.notes.length}/${MAX_NOTES_LENGTH}`}>
            <textarea id={`${id}-notes`} rows={3} maxLength={MAX_NOTES_LENGTH} placeholder="What went well? What would you change?" value={f.notes} onChange={(e) => set('notes', e.target.value)} className={`${inputCls} h-auto py-3 resize-y`} />
          </Field>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-line bg-surface/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
          {session &&
            (confirmDelete ? (
              <Button variant="danger" size="sm" onClick={async () => { await remove(session.id); onClose() }}>
                Confirm delete
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-neg hover:text-neg" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ))}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : session ? 'Save changes' : 'Save session'}
            </Button>
          </div>
        </div>
      </motion.form>
    </div>
  )
}
