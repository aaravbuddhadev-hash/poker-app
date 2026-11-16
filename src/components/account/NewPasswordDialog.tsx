import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../state/AuthProvider'
import { useToast } from '../../state/ToastProvider'
import { Button, Field, inputCls } from '../ui'
import { MIN_PASSWORD } from './AccountCard'

/** Shown after opening a password-reset email link, on whatever screen it landed. */
export function NewPasswordDialog() {
  const { recovering, updatePassword, signOut } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (recovering) input.current?.focus()
  }, [recovering])

  if (!recovering) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`Choose a password with at least ${MIN_PASSWORD} characters.`)
    setBusy(true)
    const r = await updatePassword(password)
    setBusy(false)
    if (!r.ok) return setError(r.message)
    setPassword('')
    toast('Password updated')
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="new-password-title">
      <form onSubmit={submit} noValidate className="grid w-full max-w-sm gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <div className="grid gap-1">
          <h2 id="new-password-title" className="font-display text-xl font-bold">
            Choose a new password
          </h2>
          <p className="text-sm text-muted">You opened a password reset link. Set a new password to finish.</p>
        </div>
        <Field label="New password" htmlFor="new-password" error={error ?? undefined} hint={`At least ${MIN_PASSWORD} characters.`}>
          <input
            ref={input}
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={inputCls}
            value={password}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => void signOut()} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
        </div>
      </form>
    </div>
  )
}
