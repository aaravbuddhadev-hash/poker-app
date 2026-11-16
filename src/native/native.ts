import { Capacitor } from '@capacitor/core'

/**
 * Everything that behaves differently inside the iOS app. On the website each
 * of these is a no-op or falls back to the browser, so screens can call them
 * without checking where they're running.
 *
 * The plugins are imported lazily, so the website never downloads them.
 */
export const isNativeApp = Capacitor.isNativePlatform()

const KEY_PREFIX = 'river.v1.'

// ---------------------------------------------------------------------------
// Storage that survives iOS clearing web data
// ---------------------------------------------------------------------------
// The app keeps its data in the web view's localStorage. iOS may clear that
// when the device is short of space, so inside the app every Riverline key is
// also mirrored to native storage (UserDefaults, via @capacitor/preferences)
// and restored from there at launch.

const mirrored = new Map<string, string>()
let snapshotTimer: ReturnType<typeof setTimeout> | undefined

async function preferences() {
  return (await import('@capacitor/preferences')).Preferences
}

function riverlineKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(KEY_PREFIX)) keys.push(k)
  }
  return keys
}

/** Copy anything missing from the web view's storage back from native storage. */
async function restoreStorage() {
  const prefs = await preferences()
  const { keys } = await prefs.keys()
  for (const key of keys.filter((k) => k.startsWith(KEY_PREFIX))) {
    const { value } = await prefs.get({ key })
    if (value === null) continue
    mirrored.set(key, value)
    // The web view's copy is the newer one if both exist.
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value)
  }
}

/** Bring native storage in line with the web view's: write changes, remove deleted keys. */
async function snapshotStorage() {
  const prefs = await preferences()
  const current = new Set(riverlineKeys())
  for (const key of current) {
    const value = localStorage.getItem(key)
    if (value !== null && mirrored.get(key) !== value) {
      await prefs.set({ key, value })
      mirrored.set(key, value)
    }
  }
  for (const key of [...mirrored.keys()]) {
    if (!current.has(key)) {
      await prefs.remove({ key })
      mirrored.delete(key)
    }
  }
}

function scheduleSnapshot() {
  clearTimeout(snapshotTimer)
  snapshotTimer = setTimeout(() => void snapshotStorage().catch(() => {}), 400)
}

/** Watch every write to localStorage (the app's, and Supabase's sign-in session). */
function watchStorageWrites() {
  const proto = Object.getPrototypeOf(localStorage) as Storage
  for (const method of ['setItem', 'removeItem', 'clear'] as const) {
    const original = proto[method] as (...args: unknown[]) => void
    ;(proto as unknown as Record<string, unknown>)[method] = function (this: Storage, ...args: unknown[]) {
      original.apply(this, args)
      if (this === localStorage) scheduleSnapshot()
    }
  }
}

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------

/** Run before the app renders. Does nothing on the website. */
export async function startNative() {
  if (!isNativeApp) return
  try {
    await restoreStorage()
  } catch {
    // Native storage unavailable: carry on with whatever the web view has.
  }
  watchStorageWrites()
  const { App } = await import('@capacitor/app')
  // Save everything before iOS suspends the app, and sync when it comes back
  // (the app listens for window focus to sync).
  void App.addListener('pause', () => void snapshotStorage().catch(() => {}))
  void App.addListener('resume', () => window.dispatchEvent(new Event('focus')))
}

/** Hide the native launch screen once the first screen has rendered. */
export async function hideLaunchScreen() {
  if (!isNativeApp) return
  const { SplashScreen } = await import('@capacitor/splash-screen')
  await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {})
}

/** Status bar text that stays readable on the current theme. */
export async function setStatusBarTheme(theme: 'dark' | 'light') {
  if (!isNativeApp) return
  const { StatusBar, Style } = await import('@capacitor/status-bar')
  await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'error'

/** A small tap of feedback on iPhone; nothing on the website. */
export function haptic(kind: HapticKind) {
  if (!isNativeApp) return
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      if (kind === 'selection') return Haptics.selectionChanged()
      if (kind === 'light') return Haptics.impact({ style: ImpactStyle.Light })
      if (kind === 'medium') return Haptics.impact({ style: ImpactStyle.Medium })
      return Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Error })
    })
    .catch(() => {})
}

// ---------------------------------------------------------------------------
// Saving and sharing files
// ---------------------------------------------------------------------------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function browserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Hand a file to the user. In the iOS app this opens the share sheet, where
 * they can save it to Files or Photos, or send it on (browser downloads do
 * nothing inside an app). On the website: the share sheet if `preferShare` and
 * the browser supports it, otherwise a download.
 */
export async function saveOrShareFile(blob: Blob, filename: string, opts: { title?: string; text?: string; preferShare?: boolean } = {}): Promise<ShareOutcome> {
  if (isNativeApp) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
    const written = await Filesystem.writeFile({ path: filename, data: await blobToBase64(blob), directory: Directory.Cache })
    try {
      await Share.share({ title: opts.title, text: opts.text, files: [written.uri] })
      return 'shared'
    } catch {
      return 'cancelled' // the person closed the share sheet
    }
  }
  if (opts.preferShare) {
    const file = new File([blob], filename, { type: blob.type })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: opts.title, text: opts.text })
        return 'shared'
      } catch {
        return 'cancelled'
      }
    }
  }
  browserDownload(blob, filename)
  return 'downloaded'
}
