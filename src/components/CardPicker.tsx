import { cardName, makeCard, RANK_CHARS, SUIT_SYMBOLS, type Card } from '../poker/cards'
import { cx } from './ui'

const SUIT_ORDER = [3, 2, 1, 0] // spades, hearts, diamonds, clubs
const RANK_ORDER = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] // A down to 2

/** 52-card grid. Cards already in use are disabled, so duplicates are impossible. */
export function CardPicker({ used, onPick, disabled }: { used: ReadonlySet<Card>; onPick: (c: Card) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-1.5" role="group" aria-label="Choose a card">
      {SUIT_ORDER.map((suit) => (
        <div key={suit} className="grid grid-cols-13 gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
          {RANK_ORDER.map((rank) => {
            const c = makeCard(rank, suit)
            const isUsed = used.has(c)
            const red = suit === 1 || suit === 2
            const r = RANK_CHARS[rank] === 'T' ? '10' : RANK_CHARS[rank]
            return (
              <button
                key={c}
                type="button"
                disabled={isUsed || disabled}
                onClick={() => onPick(c)}
                aria-label={isUsed ? `${cardName(c)} (in use)` : cardName(c)}
                className={cx(
                  'grid h-10 min-w-0 place-items-center rounded-md border text-[11px] font-bold leading-[1.05] transition sm:h-12 sm:text-sm',
                  isUsed
                    ? 'border-transparent bg-surface-2/40 text-muted/30'
                    : 'border-black/10 bg-[#fffdf8] shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50',
                  !isUsed && (red ? 'text-[#c0262d]' : 'text-[#18201c]'),
                )}
              >
                <span className="grid justify-items-center">
                  <span className={r === '10' ? 'tracking-[-0.08em]' : ''}>{r}</span>
                  <span>{SUIT_SYMBOLS[suit]}</span>
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
