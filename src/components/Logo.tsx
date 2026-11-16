import { useId } from 'react'

// Riverline "Breakout Spade" mark on a 120 x 120 grid. Same geometry as the
// files in branding/final (generated from one source), so the in-app logo and
// the exported assets always match.
export const SPADE_PATH = 'M60 14C44 34 22 44 22 64C22 80 40 86 52 76L48 100H72L68 76C80 86 98 80 98 64C98 44 76 34 60 14Z'
export const LINE_POINTS = '33,73 46,61 58,68 97,23'

/** The mark alone. Colors follow the theme (emerald spade, gold breakout). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className={className}>
      <defs>
        <mask id={`${id}c`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <polyline points={LINE_POINTS} fill="none" stroke="#000" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <mask id={`${id}o`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <path d={SPADE_PATH} fill="#000" />
        </mask>
      </defs>
      <path d={SPADE_PATH} fill="var(--emerald)" mask={`url(#${id}c)`} />
      <polyline points={LINE_POINTS} fill="none" stroke="var(--gold)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" mask={`url(#${id}o)`} />
      <circle cx="97" cy="23" r="8" fill="var(--gold)" />
    </svg>
  )
}

/** Mark + "Riverline" wordmark. */
export function Logo({ size = 28, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Riverline">
      <LogoMark size={size} />
      {withWordmark && <span className="font-display text-xl font-bold tracking-tight">Riverline</span>}
    </span>
  )
}
