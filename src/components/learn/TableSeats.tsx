import { useState } from 'react'
import { Button } from '../ui'

const SEATS = 6

/** Six-seat table showing the dealer button, blinds and first to act; "Next hand" moves the button. */
export function TableSeats() {
  const [button, setButton] = useState(0)
  const sb = (button + 1) % SEATS
  const bb = (button + 2) % SEATS
  const utg = (button + 3) % SEATS

  return (
    <figure className="my-2 grid gap-3">
      <div
        className="relative mx-auto aspect-[16/10] w-full max-w-md rounded-[50%] border-[10px] border-[#3a2a1c]"
        style={{ background: 'radial-gradient(100% 100% at 50% 30%, #1d6b4b, #0f3a29)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.45)' }}
      >
        <span className="absolute inset-0 grid place-items-center text-xs font-semibold uppercase tracking-[0.14em] text-[#ede7d6]/60">
          Clockwise →
        </span>
        {Array.from({ length: SEATS }, (_, i) => {
          // Seats evenly around an ellipse, starting at the bottom and going clockwise.
          const angle = Math.PI / 2 + (i * 2 * Math.PI) / SEATS
          const x = 50 + 46 * Math.cos(angle)
          const y = 50 + 44 * Math.sin(angle)
          const tag = i === button ? 'D' : i === sb ? 'SB' : i === bb ? 'BB' : null
          return (
            <div key={i} className="absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5" style={{ left: `${x}%`, top: `${y}%` }}>
              <div className={`grid size-11 place-items-center rounded-full border-2 text-xs font-bold shadow-md ${i === utg ? 'border-[#d4b062] bg-[#1c2521] text-[#d4b062]' : 'border-white/20 bg-[#1c2521] text-[#ede7d6]'}`}>
                {i + 1}
              </div>
              {tag && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${tag === 'D' ? 'bg-[#ede7d6] text-[#0f1412]' : 'bg-[#d4b062] text-[#0f1412]'}`}>{tag}</span>
              )}
            </div>
          )
        })}
      </div>
      <figcaption className="grid gap-2 text-center text-sm text-muted">
        <span>
          Button: seat {button + 1}. Small blind: seat {sb + 1}. Big blind: seat {bb + 1}.{' '}
          <span className="text-gold">Seat {utg + 1}</span> acts first before the flop (“under the gun”).
        </span>
        <Button size="sm" className="justify-self-center" onClick={() => setButton((b) => (b + 1) % SEATS)}>
          Next hand: move the button
        </Button>
      </figcaption>
    </figure>
  )
}
