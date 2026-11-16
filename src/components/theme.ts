import { useSettings, type Theme } from '../state/SettingsProvider'

/** Same values as the CSS variables in index.css; charts need real colors. */
export const PALETTE: Record<Theme, Record<'pos' | 'neg' | 'even' | 'muted' | 'line' | 'emerald' | 'gold' | 'fg' | 'surface' | 'empty', string>> = {
  dark: {
    pos: '#3DD68C',
    neg: '#F0675D',
    even: '#8C9A94',
    muted: '#94A39C',
    line: '#27322E',
    emerald: '#1FA971',
    gold: '#D4B062',
    fg: '#E8ECE9',
    surface: '#161C1A',
    empty: '#1D2522',
  },
  light: {
    pos: '#0F8050',
    neg: '#C0392B',
    even: '#6B7570',
    muted: '#5B6761',
    line: '#DEDBD2',
    emerald: '#0F7A52',
    gold: '#8F6E24',
    fg: '#141816',
    surface: '#FFFFFF',
    empty: '#EEECE6',
  },
}

export function useChartColors() {
  return PALETTE[useSettings().settings.theme]
}
