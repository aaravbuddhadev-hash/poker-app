import { useId, useState } from 'react'
import type { Card } from '../../poker/cards'
import { bestHand } from '../../poker/evaluator'
import { answerText, isCorrect, type Question, type Response } from '../../quiz/types'
import { CheckIcon, CloseIcon } from '../icons'
import { PlayingCard } from '../PlayingCard'
import { PokerTable } from '../PokerTable'
import { Button, cx } from '../ui'

interface Props {
  question: Question
  /** The submitted answer, or null while the player is still choosing. */
  submitted: Response | null
  onSubmit: (r: Response) => void
}

const LETTERS = 'ABCD'

function DealtTable({ hands, board, reveal, highlight }: { hands: Card[][]; board: Card[]; reveal: boolean; highlight?: Card[] }) {
  const full = board.length === 5
  const padded: (Card | null)[] = [...board]
  while (padded.length < 5) padded.push(null)
  const hi = reveal && highlight ? new Set(highlight) : undefined
  return (
    <PokerTable
      seats={hands.map((h, i) => ({
        name: `Player ${i + 1}`,
        cards: h,
        // At showdown, hand names would give the answer away, so they appear only after answering.
        caption: reveal || !full ? bestHand([...h, ...board]).label.full : undefined,
      }))}
      board={padded}
      highlight={hi}
      dimOthers={!!hi && full}
      label={full ? 'Showdown' : board.length === 4 ? 'Turn' : board.length === 3 ? 'Flop' : 'Preflop'}
    />
  )
}

/** Renders any quiz question, takes the answer, and shows feedback. */
export function QuestionView({ question: q, submitted, onSubmit }: Props) {
  const [choice, setChoice] = useState<number | null>(null)
  const [num, setNum] = useState(() => (q.type === 'number' ? (q.unit === '%' ? 50 : 0) : 0))
  const id = useId()
  const done = submitted !== null
  const right = done && isCorrect(q, submitted)
  const chosen = submitted?.kind === 'index' ? submitted.value : choice

  const optionState = (i: number) => (!done ? (choice === i ? 'selected' : 'idle') : i === q.answer ? 'correct' : i === chosen ? 'wrong' : 'idle')
  const optionCls = (s: string) =>
    cx(
      'rounded-2xl border p-3 text-left transition-colors',
      s === 'idle' && 'border-line bg-surface hover:border-emerald/60',
      s === 'selected' && 'border-emerald bg-emerald/10',
      s === 'correct' && 'border-pos bg-pos/10',
      s === 'wrong' && 'border-neg bg-neg/10',
    )

  return (
    <div className="grid gap-5">
      <h2 className="font-display text-2xl font-bold leading-snug">{q.prompt}</h2>

      {(q.type === 'table' || (q.type === 'cards' && q.hands && q.board) || (q.type === 'number' && q.hands && q.board)) && (
        <DealtTable hands={q.hands!} board={q.board!} reveal={done} highlight={q.highlight} />
      )}

      {q.type === 'choice' && q.cards && (
        <div className="flex justify-center gap-1.5">
          {q.cards.map((c) => (
            <PlayingCard key={c} card={c} size="md" flip={false} />
          ))}
        </div>
      )}

      {(q.type === 'choice' || q.type === 'table') && (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Answers">
          {q.choices.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={chosen === i} disabled={done} onClick={() => setChoice(i)} className={optionCls(optionState(i))}>
              <span className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold">{LETTERS[i] ?? i + 1}</span>
                <span className="font-semibold">{c}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {q.type === 'cards' && (
        <div className={cx('grid gap-2', q.options[0].length === 1 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')} role="radiogroup" aria-label="Options">
          {q.options.map((cards, i) => (
            <button key={i} type="button" role="radio" aria-checked={chosen === i} disabled={done} onClick={() => setChoice(i)} className={optionCls(optionState(i))}>
              <span className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold">{LETTERS[i]}</span>
                <span className="flex flex-wrap gap-1">
                  {cards.map((c) => (
                    <PlayingCard key={c} card={c} size="sm" flip={false} />
                  ))}
                </span>
              </span>
              {done && cards.length === 5 && <span className="mt-2 block text-xs text-muted">{bestHand(cards).label.full}</span>}
            </button>
          ))}
        </div>
      )}

      {q.type === 'number' && (
        <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-semibold">
            Your answer
            <span className="font-display text-3xl font-bold tabular">
              {num}
              {q.unit === '%' ? '%' : ''}
            </span>
          </label>
          {q.unit === '%' ? (
            <input id={id} type="range" min={q.min} max={q.max} value={num} disabled={done} onChange={(e) => setNum(Number(e.target.value))} className="w-full accent-[var(--emerald)]" />
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={done || num <= q.min} onClick={() => setNum((n) => Math.max(q.min, n - 1))} aria-label="One fewer">
                −
              </Button>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={q.min}
                max={q.max}
                value={num}
                disabled={done}
                onChange={(e) => setNum(Math.max(q.min, Math.min(q.max, Math.round(Number(e.target.value) || 0))))}
                className="h-9 w-20 rounded-xl border border-line bg-surface-2 text-center font-semibold tabular"
              />
              <Button size="sm" disabled={done || num >= q.max} onClick={() => setNum((n) => Math.min(q.max, n + 1))} aria-label="One more">
                +
              </Button>
            </div>
          )}
        </div>
      )}

      {!done ? (
        <Button
          variant="primary"
          className="justify-self-start"
          disabled={q.type !== 'number' && choice === null}
          onClick={() => onSubmit(q.type === 'number' ? { kind: 'number', value: num } : { kind: 'index', value: choice! })}
        >
          Check answer
        </Button>
      ) : (
        <div className={cx('grid gap-2 rounded-2xl border p-4', right ? 'border-pos/50 bg-pos/10' : 'border-neg/50 bg-neg/10')} role="status">
          <span className={cx('flex items-center gap-2 font-semibold', right ? 'text-pos' : 'text-neg')}>
            {right ? <CheckIcon width={18} height={18} strokeWidth={3} /> : <CloseIcon width={18} height={18} strokeWidth={3} />}
            {right ? 'Correct' : 'Not quite'}
          </span>
          <span className="text-sm">
            <strong>Answer:</strong> {answerText(q)}
            {q.type === 'number' && submitted?.kind === 'number' && ` · You said ${submitted.value}${q.unit === '%' ? '%' : ''}`}
          </span>
          <p className="text-sm text-muted">{q.explanation}</p>
        </div>
      )}
    </div>
  )
}
