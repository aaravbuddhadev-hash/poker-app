import type { SupabaseClient } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AUTH_STORAGE_KEY, cloudEnabled, getClient } from '../cloud/supabase'
import { isNativeApp } from '../native/native'
import { accountKeyPrefix, storageKeys, type StorageKeys } from '../data/progressStorage'

export interface AccountUser {
  id: string
  email: string
}

export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn'

type Result = { ok: true } | { ok: false; message: string }

interface AuthValue {
  status: AuthStatus
  user: AccountUser | null
  /** True after opening a password-reset link: the app asks for a new password. */
  recovering: boolean
  signUp: (email: string, password: string) => Promise<Result & { confirmEmail?: boolean }>
  signIn: (email: string, password: string) => Promise<Result>
  /** Signs out and removes this account's copy of its data from the device. */
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<Result>
  updatePassword: (password: string) => Promise<Result>
  deleteAccount: () => Promise<Result>
}

const AuthContext = createContext<AuthValue | null>(null)

const WEBSITE = 'https://aaravbuddhadev-hash.github.io/poker-app/'

/**
 * Where email links (confirm, reset password) send people back to: this
 * site's own address. Inside the iOS app that address (capacitor://localhost)
 * means nothing to a mail app, so links go to the website instead; the new
 * password then works in the app too.
 */
function returnUrl() {
  return isNativeApp ? WEBSITE : `${window.location.origin}${window.location.pathname}`
}

/** Turn Supabase's error messages into plain, helpful ones. */
export function friendlyAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e)
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match an account.'
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first: open the link we sent you.'
  if (/already registered|already been registered/i.test(msg)) return 'There’s already an account with this email. Try signing in.'
  if (/password should be|weak password|at least \d+ characters/i.test(msg)) return 'Choose a stronger password: at least 8 characters.'
  if (/rate limit|too many requests|security purposes/i.test(msg)) return 'Too many attempts. Wait a minute and try again.'
  if (/failed to fetch|network|load failed/i.test(msg)) return 'Couldn’t reach the server. Check your connection.'
  if (/same password|different from the old/i.test(msg)) return 'Choose a password you haven’t used for this account.'
  return 'Something went wrong. Please try again.'
}

/**
 * The signed-in user saved by Supabase on a previous visit, read synchronously
 * so a returning user's own data shows from the first paint (instead of a
 * flash of guest data while the client loads). Supabase confirms it moments
 * later and signs out if it's no longer valid.
 */
function savedUser(): AccountUser | null {
  if (!cloudEnabled) return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    const u = raw ? (JSON.parse(raw) as { user?: { id?: unknown; email?: unknown } }).user : undefined
    return typeof u?.id === 'string' ? { id: u.id, email: typeof u.email === 'string' ? u.email : '' } : null
  } catch {
    return null
  }
}

/** An email link (confirm address, reset password) brought the user here with a one-time code. */
function hasEmailLinkCode() {
  return new URLSearchParams(window.location.search).has('code')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(savedUser)
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (!cloudEnabled) return 'disabled'
    if (user) return 'signedIn'
    return hasEmailLinkCode() ? 'loading' : 'signedOut'
  })
  const [recovering, setRecovering] = useState(false)
  const connection = useRef<Promise<SupabaseClient> | null>(null)

  /**
   * Load the Supabase client and start listening for sign-in changes. Guests
   * who never open the sign-in form never download it.
   */
  const connect = useCallback(() => {
    connection.current ??= getClient().then(
      (client) =>
        // Hand the client out only after Supabase has reported the session it
        // started with. Otherwise a sign-in made straight away can race that
        // first report, and its late "no session" would undo the sign-in.
        new Promise<SupabaseClient>((resolve) => {
          const ready = () => resolve(client)
          window.setTimeout(ready, 5000) // never leave sign-in hanging
          client.auth.onAuthStateChange((event, session) => {
            // Keep this callback synchronous: Supabase warns against awaiting its own calls here.
            if (event === 'PASSWORD_RECOVERY') setRecovering(true)
            const u = session?.user
            setUser((prev) => (u ? (prev?.id === u.id && prev.email === u.email ? prev : { id: u.id, email: u.email ?? '' }) : null))
            setStatus(u ? 'signedIn' : 'signedOut')
            // Tidy the one-time email-link code out of the address bar.
            if (hasEmailLinkCode()) {
              const url = new URL(window.location.href)
              url.searchParams.delete('code')
              window.history.replaceState(window.history.state, '', url.toString())
            }
            if (event === 'INITIAL_SESSION') ready()
          })
        }),
    )
    return connection.current
  }, [])

  useEffect(() => {
    if (cloudEnabled && (savedUser() || hasEmailLinkCode())) connect().catch(() => setStatus('signedOut'))
  }, [connect])

  const run = useCallback(async (fn: () => Promise<{ error: unknown }>): Promise<Result> => {
    try {
      const { error } = await fn()
      return error ? { ok: false, message: friendlyAuthError(error) } : { ok: true }
    } catch (e) {
      return { ok: false, message: friendlyAuthError(e) }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const client = await connect()
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: returnUrl() } })
      if (error) return { ok: false as const, message: friendlyAuthError(error) }
      // No session yet means the project requires confirming the email first.
      return { ok: true as const, confirmEmail: !data.session }
    } catch (e) {
      return { ok: false as const, message: friendlyAuthError(e) }
    }
  }, [connect])

  const signIn = useCallback(
    (email: string, password: string) => run(async () => (await connect()).auth.signInWithPassword({ email, password })),
    [run, connect],
  )

  const signOut = useCallback(async () => {
    const id = user?.id
    try {
      await (await connect()).auth.signOut({ scope: 'local' })
    } finally {
      if (id) removeAccountData(id)
      setRecovering(false)
    }
  }, [user, connect])

  const sendPasswordReset = useCallback(
    (email: string) => run(async () => (await connect()).auth.resetPasswordForEmail(email, { redirectTo: returnUrl() })),
    [run, connect],
  )

  const updatePassword = useCallback(
    async (password: string) => {
      const r = await run(async () => (await connect()).auth.updateUser({ password }))
      if (r.ok) setRecovering(false)
      return r
    },
    [run, connect],
  )

  const deleteAccount = useCallback(async () => {
    const id = user?.id
    const r = await run(async () => (await connect()).rpc('delete_my_account'))
    if (r.ok) {
      try {
        await (await connect()).auth.signOut({ scope: 'local' })
      } catch {
        // The account is gone either way.
      }
      if (id) removeAccountData(id)
    }
    return r
  }, [run, user, connect])

  const value = useMemo(
    () => ({ status, user, recovering, signUp, signIn, signOut, sendPasswordReset, updatePassword, deleteAccount }),
    [status, user, recovering, signUp, signIn, signOut, sendPasswordReset, updatePassword, deleteAccount],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Remove a signed-out account's cached data from this device (it stays in the cloud). */
function removeAccountData(userId: string) {
  try {
    const prefix = accountKeyPrefix(userId)
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith(prefix)) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // Storage unavailable: nothing was saved there anyway.
  }
}

/** Device storage keys for whoever is using the app right now (an account, or the guest). */
export function useStorageKeys(): StorageKeys {
  const { user } = useAuth()
  const id = user?.id ?? null
  return useMemo(() => storageKeys(id), [id])
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
