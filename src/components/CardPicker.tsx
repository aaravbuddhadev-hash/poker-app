import { useState } from 'react'
import { cardName, makeCard, RANK_CHARS, SUIT_SYMBOLS, type Card } from '../poker/cards'
import { cx } from './ui'

const SUIT_ORDER = [3, 2, 1, 0] // spades, hearts, diamonds, clubs
const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades']
const RANK_ORDER = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] // A down to 2

const isRed = (suit: number) => suit === 1 || suit === 2

/**
 * Pick a card. Cards already in use are disabled, so duplicates are impossible.
 *
 * Tablets and desktops see all 52 cards at once. On a phone that grid makes
 * each card about 20px wide, too small to tap reliably, so phones choose a
 * suit first and then one of 13 larger cards.
 */
export function CardPicker({ used, onPick, disabled }: { used: ReadonlySet<Card>; onPick: (c: Card) => void; disabled?: boolean }) {
  const [suit, setSuit] = useState(3)
  return (
    <div role="group" aria-label="Choose a card">
      {/* Phones: suit tabs, then 13 cards in two rows. */}
      <div className="grid gap-3 sm:hidden">
        <div role="radiogroup" aria-label="Suit" className="grid grid-cols-4 gap-1.5">
          {SUIT_ORDER.map((s) => {
            const left = RANK_ORDER.filter((r) => !used.has(makeCard(r, s))).length
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={suit === s}
                onClick={() => setSuit(s)}
                className={cx(
                  'grid h-12 place-items-center rounded-xl border text-xl leading-none transition-colors',
                  suit === s ? 'border-emerald bg-emerald/15' : 'border-line bg-surface-2',
                  isRed(s) ? 'text-[#e0474e]' : 'text-fg',
                )}
              >
                <span aria-hidden>{SUIT_SYMBOLS[s]}</span>
                <span className="sr-only">
                  {SUIT_NAMES[s]}, {left} available
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {RANK_ORDER.map((rank) => (
            <CardButton key={rank} card={makeCard(rank, suit)} used={used} disabled={disabled} onPick={onPick} size="lg" />
          ))}
        </div>
      </div>

      {/* Larger screens: the whole deck. */}
      <div className="hidden gap-1.5 sm:grid">
        {SUIT_ORDER.map((s) => (
          <div key={s} className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {RANK_ORDER.map((rank) => (
              <CardButton key={rank} card={makeCard(rank, s)} used={used} disabled={disabled} onPick={onPick} size="sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function CardButton({
  card,
  used,
  disabled,
  onPick,
  size,
}: {
  card: Card
  used: ReadonlySet<Card>
  disabled?: boolean
  onPick: (c: Card) => void
  size: 'sm' | 'lg'
}) {
  const isUsed = used.has(card)
  const suit = card % 4
  const rank = Math.floor(card / 4)
  const r = RANK_CHARS[rank] === 'T' ? '10' : RANK_CHARS[rank]
  return (
    <button
      type="button"
      disabled={isUsed || disabled}
      onClick={() => onPick(card)}
      className={cx(
        'grid min-w-0 place-items-center rounded-md border font-bold leading-[1.05] transition',
        size === 'lg' ? 'h-14 text-base' : 'h-12 text-sm',
        isUsed
          ? 'border-transparent bg-surface-2/40 text-muted/30'
          : 'border-black/10 bg-[#fffdf8] shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50',
        !isUsed && (isRed(suit) ? 'text-[#c0262d]' : 'text-[#18201c]'),
      )}
    >
      {/* Short label for the eye, full name for screen readers. */}
      <span aria-hidden className="grid justify-items-center">
        <span className={r === '10' ? 'tracking-[-0.08em]' : ''}>{r}</span>
        <span>{SUIT_SYMBOLS[suit]}</span>
      </span>
      <span className="sr-only">
        {cardName(card)}
        {isUsed && ' (in use)'}
      </span>
    </button>
  )
}
