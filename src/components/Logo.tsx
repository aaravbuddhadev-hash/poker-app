/** Temporary "River" mark (Card Line concept) until branding is approved. */
export function Logo({ size = 28, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
        <rect x="28" y="16" width="64" height="88" rx="10" fill="none" stroke="var(--emerald)" strokeWidth="8" />
        <polyline points="40,82 54,66 64,72 80,40" fill="none" stroke="var(--fg)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="80" cy="40" r="9" fill="var(--gold)" />
      </svg>
      {withWordmark && <span className="font-display text-xl font-bold tracking-tight">River</span>}
    </span>
  )
}
