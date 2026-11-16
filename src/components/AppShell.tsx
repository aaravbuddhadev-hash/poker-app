import { NavLink, Outlet, useLocation } from 'react-router'
import { Suspense, useEffect } from 'react'
import { useSessions } from '../state/SessionsProvider'
import { useSessionForm } from '../state/SessionFormProvider'
import { useSettings } from '../state/SettingsProvider'
import { HomeIcon, LearnIcon, PlusIcon, ProfileIcon, PuzzleIcon, SessionsIcon } from './icons'
import { ErrorBoundary } from './ErrorBoundary'
import { Logo } from './Logo'
import { cx, PageLoading } from './ui'

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/sessions', label: 'Sessions', icon: SessionsIcon },
  { to: '/puzzle', label: 'Puzzle', icon: PuzzleIcon },
  { to: '/learn', label: 'Learn', icon: LearnIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
]

export function AppShell() {
  const { openNew } = useSessionForm()
  const { isDemo } = useSessions()
  const { update } = useSettings()
  const { pathname } = useLocation()

  // Block body on purpose: newer browsers return a Promise from scrollTo, and
  // React would treat a returned value as the effect's cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex sticky top-0 h-dvh flex-col gap-6 border-r border-line px-4 py-6">
        <div className="px-2">
          <Logo />
        </div>
        <button type="button" onClick={() => openNew()} className="flex h-11 items-center justify-center gap-2 rounded-full bg-emerald text-sm font-semibold text-on-accent hover:brightness-110">
          <PlusIcon width={18} height={18} /> Add session
        </button>
        <nav className="grid gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'text-emerald' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3">
          <SyncNotice />
          <p className="px-2 text-xs text-muted">For personal records and learning. Riverline never handles money.</p>
        </div>
      </aside>

      <div className="min-w-0">
        {isDemo && (
          <div className="sticky top-0 z-30 flex items-center justify-center gap-3 border-b border-gold/30 bg-[color-mix(in_oklab,var(--gold)_14%,var(--bg))] px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-xs md:text-sm">
            <span>
              <strong className="text-gold">Demo mode</strong> · Fictional sessions. Your own records are hidden, not changed.
            </span>
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => update({ demoMode: false })}>
              Exit demo
            </button>
          </div>
        )}

        {/* Mobile top bar */}
        <header className="flex items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] md:hidden">
          <Logo size={26} />
          <SyncNotice />
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 md:px-8 md:pb-12 md:pt-8">
          {/* Screens load on first visit; show a placeholder meanwhile. */}
          {/* A crash stays inside this screen; moving to another screen starts fresh. */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile floating add button (session screens only) + bottom nav */}
      {(pathname === '/' || pathname.startsWith('/sessions')) && (
        <button
          type="button"
          onClick={() => openNew()}
          aria-label="Add session"
          className="fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-emerald text-on-accent shadow-lg shadow-black/40 md:hidden bottom-[calc(76px+env(safe-area-inset-bottom))]"
        >
          <PlusIcon width={26} height={26} />
        </button>
      )}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('grid justify-items-center gap-0.5 py-2.5 text-[11px] font-semibold', isActive ? 'text-emerald' : 'text-muted')}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/**
 * Shown on every screen only when signed-in changes aren't reaching the cloud,
 * so a sync problem can't go unnoticed. Links to Profile for details and retry.
 */
function SyncNotice() {
  const { cloud } = useSessions()
  if (!cloud || (cloud.state !== 'offline' && cloud.state !== 'error')) return null
  if (cloud.state === 'offline' && cloud.pending === 0) return null // nothing at risk
  const waiting = cloud.pending > 0 ? `${cloud.pending} change${cloud.pending === 1 ? '' : 's'} waiting` : 'Not synced'
  return (
    <NavLink
      to="/profile"
      className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg"
      title={cloud.state === 'offline' ? 'You’re offline. Changes are saved on this device and upload when you reconnect.' : 'Couldn’t reach the server. Open Profile to retry.'}
    >
      <span aria-hidden className={cx('size-2 rounded-full', cloud.state === 'error' ? 'bg-neg' : 'bg-muted')} />
      {cloud.state === 'offline' ? `Offline · ${waiting}` : `Sync problem · ${waiting}`}
    </NavLink>
  )
}
