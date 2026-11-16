import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getBrowserStore } from '../data/sessionRepository'
import { isCurrencyCode, type CurrencyCode } from '../lib/money'

export type Theme = 'dark' | 'light'

export interface Settings {
  currency: CurrencyCode
  theme: Theme
  demoMode: boolean
}

export const SETTINGS_KEY = 'river.v1.settings'
const DEFAULTS: Settings = { currency: 'USD', theme: 'dark', demoMode: false }

function load(): Settings {
  try {
    const raw = getBrowserStore().getItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<Settings>
    return {
      currency: isCurrencyCode(p.currency) ? p.currency : DEFAULTS.currency,
      theme: p.theme === 'light' ? 'light' : 'dark',
      demoMode: p.demoMode === true,
    }
  } catch {
    return DEFAULTS
  }
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', settings.theme === 'dark' ? '#0F1412' : '#F6F2E8')
    try {
      getBrowserStore().setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Storage full or blocked: settings still apply for this visit.
    }
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
