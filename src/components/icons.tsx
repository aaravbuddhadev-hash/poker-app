import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></svg>
)
export const SessionsIcon = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 15l3-3 2 2 3-4" /></svg>
)
export const PuzzleIcon = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="6" width="9" height="13" rx="2" transform="rotate(-8 7.5 12.5)" /><rect x="11" y="4" width="9" height="13" rx="2" transform="rotate(8 15.5 10.5)" /></svg>
)
export const LearnIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 6.5 12 3l9 3.5-9 3.5z" /><path d="M7 8.5v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5" /><path d="M21 6.5V12" /></svg>
)
export const ProfileIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const ChevronLeft = (p: P) => (
  <svg {...base} {...p}><path d="m15 6-6 6 6 6" /></svg>
)
export const ChevronRight = (p: P) => (
  <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>
)
export const SearchIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}><path d="m5 12 5 5 9-10" /></svg>
)
export const ClockIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
)
