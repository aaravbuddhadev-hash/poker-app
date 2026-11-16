import { useState } from 'react'
import { parseCards } from '../../poker/cards'
import { bestHand, explainComparison } from '../../poker/evaluator'
import { PlayingCard } from '../PlayingCard'
import { Button } from '../ui'

/** Two or more fictional hands and a full board; reveal the winner, computed by the engine. */
export function ShowdownExample({ players, board, prompt }: { players: { name: string; hole: string }[]; board: string; prompt?: string }) {
  const [revealed, setRevealed] = useState(false)
  const boardCards = parseCards(board)
  const bests = players.map((p) => bestHand([...parseCards(p.hole), ...boardCards]))
  const top = Math.max(...bests.map((b) => b.score))
  const winners = bests.flatMap((b, i) => (b.score === top ? [i] : []))
  const losers = bests.filter((b) => b.score !== top).map((b) => b.score)
  const reason = winners.length > 1 ? explainComparison(top, top) : explainComparison(top, Math.max(...losers))
  const highlight = new Set(revealed ? winners.flatMap((i) => bests[i].cards) : [])

  return (
    <figure className="my-2 grid gap-4 rounded-2xl p-4 text-[#ede7d6]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #1d6b4b, #0f3a29)' }}>
      {prompt && <p className="text-center text-sm font-semibold">{prompt}</p>}
      <div className="flex justify-center gap-1.5">
        {boardCards.map((c) => (
          <PlayingCard key={c} card={c} size="sm" flip={false} highlight={highlight.has(c)} dim={revealed && !highlight.has(c)} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {players.map((p, i) => (
          <div key={p.name} className={`grid justify-items-center gap-1.5 rounded-xl p-2 ${revealed && winners.includes(i) ? 'ring-2 ring-[#d4b062]' : ''}`}>
            <span className="text-xs font-semibold">{p.name}</span>
            <div className="flex gap-1">
              {parseCards(p.hole).map((c) => (
                <PlayingCard key={c} card={c} size="sm" flip={false} highlight={highlight.has(c)} dim={revealed && !winners.includes(i)} />
              ))}
            </div>
            {revealed && <span className="max-w-36 text-center text-[11px] text-[#ede7d6]/80">{bests[i].label.full}</span>}
          </div>
        ))}
      </div>
      <figcaption className="grid justify-items-center gap-2 text-center text-sm">
        {revealed ? (
          <>
            <strong>
              {winners.length > 1 ? `Split pot: ${winners.map((i) => players[i].name).join(' and ')}.` : `${players[winners[0]].name} wins.`}
            </strong>
            <span className="text-[#ede7d6]/80">{reason}</span>
            <button type="button" className="text-xs underline underline-offset-2" onClick={() => setRevealed(false)}>
              Hide the answer
            </button>
          </>
        ) : (
          <Button size="sm" variant="primary" onClick={() => setRevealed(true)}>
            Reveal the winner
          </Button>
        )}
      </figcaption>
    </figure>
  )
}
