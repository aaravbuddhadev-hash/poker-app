import { useSettings, type Theme } from '../state/SettingsProvider'

/** Same values as the CSS variables in index.css; charts need real colors. */
export const PALETTE: Record<Theme, Record<'pos' | 'neg' | 'even' | 'muted' | 'line' | 'emerald' | 'gold' | 'fg' | 'surface' | 'empty', string>> = {
  dark: {
    pos: '#3DD68C',
    neg: '#F0675D',
    even: '#8F9A92',
    muted: '#9EA89F',
    line: '#26312C',
    emerald: '#1FA971',
    gold: '#D4B062',
    fg: '#EDE7D6',
    surface: '#161D1A',
    empty: '#1C2521',
  },
  light: {
    pos: '#0F7A4C',
    neg: '#B93A2E',
    even: '#6B7570',
    muted: '#5C665F',
    line: '#DDD6C6',
    emerald: '#0F6B4A',
    gold: '#8A6A22',
    fg: '#0F1412',
    surface: '#FFFDF8',
    empty: '#EEE9DC',
  },
}

export function useChartColors() {
  return PALETTE[useSettings().settings.theme]
}
