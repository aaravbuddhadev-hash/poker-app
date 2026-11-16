import { Component, type ErrorInfo, type ReactNode } from 'react'

const RELOAD_FLAG = 'river.v1.reloaded-for-update'

/**
 * After a new version is published, a tab that was already open still asks for
 * the old version's screen files, which no longer exist. Those failures look
 * like this in each browser.
 */
export function isStaleDownload(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Loading chunk .* failed/i.test(msg)
}

/**
 * Reload once to pick up the new version. The flag stops a reload loop if the
 * files really are missing (or the device is offline); it clears after a
 * successful load.
 */
export function reloadForUpdate(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function clearReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

interface Props {
  children: ReactNode
  /** Full-page version for errors outside the app's frame. */
  fullScreen?: boolean
}

/**
 * Catches a crash in part of the app and shows a way out instead of a blank
 * page. Saved data is never touched: it's all in storage, not in the screen.
 */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isStaleDownload(error) && reloadForUpdate()) return
    console.error('Riverline caught an error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (error === null) return this.props.children
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    const stale = isStaleDownload(error)
    const title = offline ? 'You’re offline' : stale ? 'Riverline was updated' : 'Something went wrong'
    const body = offline
      ? 'This screen hasn’t been downloaded yet. Reconnect and try again; everything you’ve saved is safe.'
      : stale
        ? 'A newer version is available. Reload to get it; everything you’ve saved is safe.'
        : 'This screen hit an unexpected problem. Your saved sessions and progress are safe. Reloading usually fixes it.'

    return (
      <div role="alert" className={this.props.fullScreen ? 'grid min-h-dvh place-items-center bg-bg p-6 text-fg' : 'grid place-items-center py-16'}>
        <div className="grid max-w-md gap-4 rounded-2xl border border-line bg-surface p-6 text-center">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted">{body}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center rounded-full bg-emerald px-5 text-sm font-semibold text-on-accent hover:brightness-110"
            >
              Reload
            </button>
            <a href="#/" onClick={() => this.setState({ error: null })} className="inline-flex h-11 items-center rounded-full border border-line bg-surface-2 px-5 text-sm font-semibold hover:border-muted/60">
              Go to Home
            </a>
          </div>
          {!offline && !stale && error instanceof Error && (
            <details className="text-left text-xs text-muted">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
