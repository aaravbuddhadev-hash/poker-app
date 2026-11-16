import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import type { Card } from '../poker/cards'
import { PlayingCard } from './PlayingCard'
import { cx } from './ui'

export interface TableSeat {
  name: string
  cards: (Card | null)[]
  /** Accent color for the seat (matches prediction sliders and result bars). */
  color?: string
  /** Small line under the name, e.g. the current hand or equity. */
  caption?: ReactNode
  winner?: boolean
  faceDown?: boolean
}

interface Props {
  seats: TableSeat[]
  /** Up to five board cards; `null` shows a face-down card that isn't dealt yet. */
  board: (Card | null)[]
  /** Cards to raise and outline, e.g. the winning five. */
  highlight?: ReadonlySet<Card>
  /** Fade cards not in `highlight` (used at showdown). */
  dimOthers?: boolean
  dealerSeat?: number
  /** Change to replay the dealing animation. */
  dealKey?: string | number
  /** Text in the middle of the felt above the board, e.g. "Flop". */
  label?: ReactNode
  className?: string
}

// Seat anchors (% of the table) for 2..6 players; seat 0 is the hero at the bottom.
// Top and bottom seats are pinned by their outer edge so they never spill past the
// oval rim; seats away from the center get extra inset where the rim curves.
type Anchor = { x: number; top?: number; bottom?: number; y?: number }
const LAYOUTS: Record<number, Anchor[]> = {
  2: [{ x: 50, bottom: 5 }, { x: 50, top: 5 }],
  3: [{ x: 50, bottom: 5 }, { x: 27, top: 10 }, { x: 73, top: 10 }],
  4: [{ x: 50, bottom: 5 }, { x: 13, y: 50 }, { x: 50, top: 5 }, { x: 87, y: 50 }],
  5: [{ x: 50, bottom: 5 }, { x: 13, y: 60 }, { x: 28, top: 10 }, { x: 72, top: 10 }, { x: 87, y: 60 }],
  6: [{ x: 50, bottom: 5 }, { x: 13, y: 68 }, { x: 13, y: 32 }, { x: 50, top: 5 }, { x: 87, y: 32 }, { x: 87, y: 68 }],
}

function anchorStyle(a: Anchor): CSSProperties {
  if (a.top !== undefined) return { left: `${a.x}%`, top: `${a.top}%`, transform: 'translateX(-50%)' }
  if (a.bottom !== undefined) return { left: `${a.x}%`, bottom: `${a.bottom}%`, transform: 'translateX(-50%)' }
  return { left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -50%)' }
}

/**
 * Reusable oval Hold'em table: seats, dealer button, community cards, a dealing
 * animation and winner highlighting. Uses PlayingCard, the app's only card renderer.
 */
export function PokerTable({ seats, board, highlight, dimOthers, dealerSeat, dealKey, label, className }: Props) {
  const reduce = useReducedMotion()
  const layout = LAYOUTS[Math.min(6, Math.max(2, seats.length))]
  const deal = (order: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: -18, scale: 0.7 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { delay: order * 0.09, type: 'spring' as const, stiffness: 320, damping: 26 },
        }
  const isHi = (c: Card | null) => c !== null && !!highlight?.has(c)
  const isDim = (c: Card | null) => !!dimOthers && c !== null && !isHi(c)
  const holeCount = seats.reduce((n, s) => n + s.cards.length, 0)

  return (
    <div
      className={cx('relative w-full min-h-[470px] overflow-hidden rounded-[45%/38%] border-[10px] border-[#2b2017] sm:min-h-0 sm:aspect-[4/3] lg:aspect-[16/10]', className)}
      style={{
        background: 'radial-gradient(110% 90% at 50% 35%, #1f7350 0%, #155238 50%, #0d3324 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(212,176,98,0.25), inset 0 0 70px rgba(0,0,0,0.5), 0 18px 40px -12px rgba(0,0,0,0.6)',
      }}
    >
      {/* Board */}
      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-2">
        {label && <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4b062]">{label}</span>}
        <div key={`board-${dealKey}`} className="flex gap-1 sm:gap-1.5">
          {board.map((c, i) => (
            // Keyed by position: when a card is dealt here it turns over in place.
            <motion.div key={i} {...deal(holeCount + i)}>
              <PlayingCard card={c ?? 0} faceDown={c === null} size="sm" highlight={isHi(c)} dim={isDim(c)} className="sm:w-12" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Seats */}
      {seats.map((s, si) => {
        const pos = layout[si]
        return (
          <div key={si} className="absolute grid justify-items-center gap-1.5" style={anchorStyle(pos)}>
            <div key={`seat-${si}-${dealKey}`} className={cx('relative flex gap-1 rounded-xl p-1', s.winner && 'ring-2 ring-[#d4b062]')}>
              {s.cards.map((c, ci) => (
                <motion.div key={`${ci}-${c}`} {...deal(ci * seats.length + si)}>
                  <PlayingCard card={c} faceDown={s.faceDown} size="sm" highlight={isHi(c)} dim={isDim(c)} flip={false} />
                </motion.div>
              ))}
              {dealerSeat === si && (
                <span className="absolute -right-3 -top-2 grid size-6 place-items-center rounded-full bg-[#ede7d6] text-[10px] font-bold text-[#0f1412] shadow" aria-label="Dealer button">
                  D
                </span>
              )}
            </div>
            <div className="grid justify-items-center rounded-full bg-black/35 px-2.5 py-0.5 text-center leading-tight text-[#ede7d6]">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                {s.color && <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />}
                {s.name}
                {s.winner && <span className="text-[#d4b062]">· Wins</span>}
              </span>
              {s.caption && <span className="max-w-40 truncate text-[11px] text-[#ede7d6]/80">{s.caption}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
