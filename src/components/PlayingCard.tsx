import { motion, useReducedMotion } from 'motion/react'
import { cardName, isRed, rankLabel, rankOf, SUIT_SYMBOLS, suitOf, type Card } from '../poker/cards'
import { LogoMark } from './Logo'
import { cx } from './ui'

export type CardSize = 'xs' | 'sm' | 'md' | 'lg'

// Width drives everything; the card keeps a real 5:7 playing-card ratio.
const SIZE: Record<CardSize, { w: string; corner: string; pip: string; face: string; radius: string }> = {
  xs: { w: 'w-8', corner: 'text-[11px]', pip: 'text-base', face: 'text-base', radius: 'rounded-[5px]' },
  sm: { w: 'w-11', corner: 'text-[13px]', pip: 'text-xl', face: 'text-xl', radius: 'rounded-md' },
  md: { w: 'w-14', corner: 'text-[15px]', pip: 'text-2xl', face: 'text-2xl', radius: 'rounded-lg' },
  lg: { w: 'w-[4.5rem]', corner: 'text-lg', pip: 'text-[2rem]', face: 'text-[2rem]', radius: 'rounded-xl' },
}

interface Props {
  card?: Card | null
  size?: CardSize
  faceDown?: boolean
  /** Raise and outline the card (e.g. part of the winning hand). */
  highlight?: boolean
  /** Fade the card (e.g. a kicker, or not part of the best hand). */
  dim?: boolean
  /** Flip the card in when it first appears. */
  flip?: boolean
  className?: string
}

/** A realistic playing card. The one card renderer used across the app. */
export function PlayingCard({ card, size = 'md', faceDown, highlight, dim, flip = true, className }: Props) {
  const reduce = useReducedMotion()
  const s = SIZE[size]
  const base = cx('relative aspect-[5/7] shrink-0 select-none', s.w, s.radius, className)

  if (card === null || card === undefined) {
    return <div className={cx(base, 'border-2 border-dashed border-white/25 bg-black/10')} aria-hidden />
  }

  if (faceDown) {
    return (
      <div
        className={cx(base, 'grid place-items-center border border-white/15 shadow-md shadow-black/40')}
        style={{ background: 'repeating-linear-gradient(45deg, #123d2d 0 6px, #0f3326 6px 12px)' }}
        role="img"
        aria-label="Face-down card"
      >
        <div className="grid size-3/5 place-items-center rounded-md border border-[#d4b062]/40">
          <LogoMark size={20} />
        </div>
      </div>
    )
  }

  const red = isRed(card)
  const rank = rankLabel(card)
  const suit = SUIT_SYMBOLS[suitOf(card)]
  const face = rankOf(card) >= 9 && rankOf(card) <= 11 // J, Q, K

  return (
    <motion.div
      key={card}
      initial={flip && !reduce ? { rotateY: 90, opacity: 0.4 } : false}
      animate={{ rotateY: 0, opacity: dim ? 0.38 : 1, y: highlight ? -6 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{ transformPerspective: 700 }}
      role="img"
      aria-label={cardName(card)}
      className={cx(
        base,
        'bg-[#fffdf8] shadow-md shadow-black/40 ring-1 ring-black/10',
        red ? 'text-[#c0262d]' : 'text-[#18201c]',
        highlight && 'ring-2 ring-[#d4b062] shadow-lg shadow-[#d4b062]/25',
      )}
    >
      <span className={cx('absolute left-[9%] top-[5%] grid justify-items-center font-bold leading-none', s.corner)}>
        <span className={rank === '10' ? 'tracking-[-0.08em]' : ''}>{rank}</span>
        <span className="text-[0.85em] leading-none">{suit}</span>
      </span>
      <span className={cx('absolute bottom-[5%] right-[9%] grid rotate-180 justify-items-center font-bold leading-none', s.corner)}>
        <span className={rank === '10' ? 'tracking-[-0.08em]' : ''}>{rank}</span>
        <span className="text-[0.85em] leading-none">{suit}</span>
      </span>
      <span className="absolute inset-0 grid place-items-center">
        {face ? (
          <span className={cx('grid justify-items-center font-display font-bold leading-none', s.face)}>
            {rank}
            <span className="text-[0.6em]">{suit}</span>
          </span>
        ) : (
          <span className={cx('leading-none', s.pip)}>{suit}</span>
        )}
      </span>
    </motion.div>
  )
}
