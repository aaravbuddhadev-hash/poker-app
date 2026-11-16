import { useId, useState } from 'react'
import { hitChance, percent, ruleOfTwoAndFour, UNSEEN_ON_FLOP, UNSEEN_ON_TURN } from '../../learn/probability'
import { Segmented } from '../ui'

/** Interactive outs calculator: exact chance vs. the rule of 2 and 4. */
export function OutsCalculator() {
  const [outs, setOuts] = useState(9)
  const [street, setStreet] = useState<'flop' | 'turn'>('flop')
  const id = useId()
  const draws = street === 'flop' ? 2 : 1
  const unseen = street === 'flop' ? UNSEEN_ON_FLOP : UNSEEN_ON_TURN
  const exact = hitChance(outs, unseen, draws)
  const rule = ruleOfTwoAndFour(outs, draws)

  return (
    <figure className="my-2 grid gap-4 rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          Outs: <span className="tabular text-emerald">{outs}</span>
        </label>
        <Segmented
          label="When"
          value={street}
          onChange={setStreet}
          options={[
            { value: 'flop', label: 'On the flop' },
            { value: 'turn', label: 'On the turn' },
          ]}
        />
      </div>
      <input id={id} type="range" min={1} max={20} value={outs} onChange={(e) => setOuts(Number(e.target.value))} className="w-full accent-[var(--emerald)]" />
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="grid gap-0.5 rounded-xl bg-surface p-3">
          <span className="text-xs text-muted">Exact chance to hit</span>
          <span className="font-display text-2xl font-bold tabular">{percent(exact)}</span>
        </div>
        <div className="grid gap-0.5 rounded-xl bg-surface p-3">
          <span className="text-xs text-muted">Rule of {draws === 2 ? '4' : '2'} ({outs} × {draws === 2 ? 4 : 2})</span>
          <span className="font-display text-2xl font-bold tabular text-muted">{percent(rule, 0)}</span>
        </div>
      </div>
      <figcaption className="text-xs text-muted">
        {street === 'flop'
          ? `${UNSEEN_ON_FLOP} cards are unseen after the flop and two more (turn and river) are coming.`
          : `${UNSEEN_ON_TURN} cards are unseen after the turn and one more (the river) is coming.`}{' '}
        Exact chance = 1 − (chance of missing every card).
      </figcaption>
    </figure>
  )
}
