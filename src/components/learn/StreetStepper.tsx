import { useState } from 'react'
import { parseCards } from '../../poker/cards'
import { bestHand } from '../../poker/evaluator'
import { PlayingCard } from '../PlayingCard'
import { Segmented } from '../ui'

const STREETS = [
  { value: '0', label: 'Preflop', shown: 0 },
  { value: '1', label: 'Flop', shown: 3 },
  { value: '2', label: 'Turn', shown: 4 },
  { value: '3', label: 'River', shown: 5 },
] as const

/** Step through one deal street by street; the engine names the best hand at each step. */
export function StreetStepper({ hole, board, caption }: { hole: string; board: string; caption?: string }) {
  const [street, setStreet] = useState<'0' | '1' | '2' | '3'>('0')
  const holeCards = parseCards(hole)
  const boardCards = parseCards(board)
  const shown = STREETS[Number(street)].shown
  const visible = [...holeCards, ...boardCards.slice(0, shown)]
  const best = bestHand(visible)
  const inBest = new Set(visible.length >= 5 ? best.cards : [])

  return (
    <figure className="my-2 grid gap-4 rounded-2xl p-4 text-[#ede7d6]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #1d6b4b, #0f3a29)' }}>
      <Segmented label="Street" options={STREETS} value={street} onChange={setStreet} className="justify-self-center border-white/10 bg-black/25" />
      <div className="grid justify-items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4b062]">Board</span>
        <div className="flex gap-1.5">
          {boardCards.map((c, i) => (
            // The flop's three cards turn over one after another.
            <PlayingCard key={c} card={c} size="sm" faceDown={i >= shown} highlight={inBest.has(c)} flipDelay={i < 3 ? i * 0.09 : 0} />
          ))}
        </div>
      </div>
      <div className="grid justify-items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4b062]">Your hole cards</span>
        <div className="flex gap-1.5">
          {holeCards.map((c) => (
            <PlayingCard key={c} card={c} size="sm" highlight={inBest.has(c)} />
          ))}
        </div>
      </div>
      <figcaption className="text-center text-sm">
        Best hand now: <strong>{best.label.full}</strong>
        {visible.length >= 5 && <span className="block text-xs text-[#ede7d6]/70">Highlighted: the five cards that make it.</span>}
        {caption && <span className="mt-1 block text-xs text-[#ede7d6]/70">{caption}</span>}
      </figcaption>
    </figure>
  )
}
