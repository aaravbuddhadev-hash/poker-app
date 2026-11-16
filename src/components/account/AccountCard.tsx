import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../state/AuthProvider'
import { useSessions, type CloudStatus } from '../../state/SessionsProvider'
import { useToast } from '../../state/ToastProvider'
import { Button, Card, Field, inputCls, Segmented } from '../ui'

export const MIN_PASSWORD = 8

/** The Account section of Profile: sign in or create an account, and manage sync. */
export function AccountCard() {
  const { status, user } = useAuth()

  if (status === 'disabled') {
    return (
      <Card title="Account">
        <p className="max-w-prose text-sm text-muted">
          Accounts aren’t switched on for this copy of Riverline, so everything is saved in this browser on this device and nothing is sent anywhere.
        </p>
      </Card>
    )
  }
  if (status === 'loading') {
    return (
      <Card title="Account">
        <p className="text-sm text-muted">Checking your sign-in…</p>
      </Card>
    )
  }
  return <Card title="Account">{user ? <SignedIn email={user.email} /> : <SignInForm />}</Card>
}

// ---- Signed out ----------------------------------------------------------------

type Mode = 'signIn' | 'signUp' | 'reset'

function SignInForm() {
  const { signIn, signUp, sendPasswordReset } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const trimmed = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) return setError('Enter a valid email address.')
    if (mode === 'signUp' && password.length < MIN_PASSWORD) return setError(`Choose a password with at least ${MIN_PASSWORD} characters.`)
    if (mode === 'signIn' && !password) return setError('Enter your password.')
    setBusy(true)
    try {
      if (mode === 'signIn') {
        const r = await signIn(trimmed, password)
        if (!r.ok) setError(r.message)
        else toast('Signed in')
      } else if (mode === 'signUp') {
        const r = await signUp(trimmed, password)
        if (!r.ok) setError(r.message)
        else if (r.confirmEmail) setNotice(`Almost done: we sent a confirmation link to ${trimmed}. Open it in this browser to finish.`)
        else toast('Account created')
      } else {
        const r = await sendPasswordReset(trimmed)
        if (!r.ok) setError(r.message)
        else setNotice(`If there’s an account for ${trimmed}, a reset link is on its way. Open it in this browser.`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <p className="max-w-prose text-sm text-muted">
        Right now your records are saved only in this browser. Sign in to back them up and use Riverline on your other devices. Accounts are free and
        optional.
      </p>
      {mode !== 'reset' && (
        <Segmented
          label="Account"
          className="w-full sm:w-72"
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'signIn', label: 'Sign in' },
            { value: 'signUp', label: 'Create account' },
          ]}
        />
      )}
      <form onSubmit={submit} noValidate className="grid max-w-sm gap-3">
        {mode === 'reset' && <p className="text-sm font-semibold">Reset your password</p>}
        <Field label="Email" htmlFor="account-email">
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {mode !== 'reset' && (
          <Field label="Password" htmlFor="account-password" hint={mode === 'signUp' ? `At least ${MIN_PASSWORD} characters.` : undefined}>
            <input
              id="account-password"
              type="password"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {error && (
          <p role="alert" className="text-sm text-neg">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-emerald/40 bg-emerald/10 p-3 text-sm">
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'One moment…' : mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Send reset link'}
          </Button>
          {mode === 'signIn' && (
            <Button variant="ghost" size="sm" onClick={() => switchMode('reset')}>
              Forgot password?
            </Button>
          )}
          {mode === 'reset' && (
            <Button variant="ghost" size="sm" onClick={() => switchMode('signIn')}>
              Back to sign in
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

// ---- Signed in -----------------------------------------------------------------

function SignedIn({ email }: { email: string }) {
  const { signOut, deleteAccount } = useAuth()
  const { cloud, syncNow, guestData, importGuestData, isDemo } = useSessions()
  const toast = useToast()
  const [confirm, setConfirm] = useState<'signOut' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = cloud?.pending ?? 0

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-xs text-muted">Signed in as</span>
          <span className="truncate font-semibold">{email}</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncLine cloud={cloud} />
          <Button size="sm" disabled={cloud?.state === 'syncing'} onClick={() => void syncNow()}>
            Sync now
          </Button>
        </div>
      </div>

      {isDemo && <p className="text-xs text-muted">Demo mode is on: the fictional sessions you see stay on this device and are never uploaded.</p>}

      {guestData && (
        <div className="grid gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm">This device also has {describeGuest(guestData)} from before you signed in. Add it to your account to keep everything together.</p>
          <div>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const n = await importGuestData()
                  toast(n > 0 ? `Added ${n} session${n === 1 ? '' : 's'} to your account` : 'Added to your account')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Add to my account
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {confirm === 'signOut' ? (
          <ConfirmRow
            message={
              pending > 0
                ? `${pending} change${pending === 1 ? " hasn't" : "s haven't"} reached the cloud yet and will be lost if you sign out now. Sign out anyway?`
                : 'Sign out? Your data stays in your account and is removed from this device.'
            }
            confirmLabel="Sign out"
            danger={pending > 0}
            busy={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => {
              setBusy(true)
              try {
                await signOut()
                toast('Signed out')
              } finally {
                setBusy(false)
              }
            }}
          />
        ) : confirm === 'delete' ? (
          <ConfirmRow
            message="Permanently delete your account and every session and bit of progress saved in it, on all devices? This can’t be undone. Export your sessions first if you want a copy."
            confirmLabel="Delete my account"
            danger
            busy={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => {
              setBusy(true)
              try {
                const r = await deleteAccount()
                if (r.ok) toast('Your account was deleted')
                else toast(r.message, 'error')
              } finally {
                setBusy(false)
              }
            }}
          />
        ) : (
          <>
            <Button size="sm" onClick={() => setConfirm('signOut')}>
              Sign out
            </Button>
            <Button size="sm" variant="ghost" className="text-neg hover:text-neg" onClick={() => setConfirm('delete')}>
              Delete account
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function describeGuest(g: { sessions: number; hasProgress: boolean }) {
  const parts: string[] = []
  if (g.sessions > 0) parts.push(`${g.sessions} session${g.sessions === 1 ? '' : 's'}`)
  if (g.hasProgress) parts.push('learning progress')
  return parts.join(' and ')
}

function ConfirmRow(props: { message: string; confirmLabel: string; danger?: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="grid w-full gap-3">
      <p className="max-w-prose text-sm">{props.message}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={props.onCancel} disabled={props.busy}>
          Cancel
        </Button>
        <Button size="sm" variant={props.danger ? 'danger' : 'primary'} onClick={props.onConfirm} disabled={props.busy}>
          {props.busy ? 'One moment…' : props.confirmLabel}
        </Button>
      </div>
    </div>
  )
}

/** "Synced 2 min ago", "Syncing…", "Offline · 3 changes waiting". */
export function SyncLine({ cloud }: { cloud: CloudStatus | null }) {
  const now = useNow(30_000)
  if (!cloud) return null
  const waiting = cloud.pending > 0 ? ` · ${cloud.pending} change${cloud.pending === 1 ? '' : 's'} waiting` : ''
  const [dot, text] =
    cloud.state === 'syncing'
      ? ['bg-gold animate-pulse', 'Syncing…']
      : cloud.state === 'offline'
        ? ['bg-muted', `Offline${waiting}`]
        : cloud.state === 'error'
          ? ['bg-neg', `Couldn’t sync${waiting}`]
          : ['bg-emerald', `Synced ${ago(cloud.lastSyncedAt, now)}${waiting}`]
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" role="status">
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {text}
    </span>
  )
}

function ago(iso: string | null, now: number) {
  if (!iso) return ''
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} hr ago`
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(t)
  }, [everyMs])
  return now
}
