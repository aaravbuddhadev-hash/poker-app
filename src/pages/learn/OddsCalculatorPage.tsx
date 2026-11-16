import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CardPicker } from '../../components/CardPicker'
import { PlayingCard } from '../../components/PlayingCard'
import { Button, PageHeader, cx } from '../../components/ui'
import { cardName, parseCards, remainingDeck, shuffled, type Card } from '../../poker/cards'
import { bestHand, explainComparison } from '../../poker/evaluator'
import { useEquity } from '../../state/useEquity'

type Slot = { kind: 'hand'; p: number; i: number } | { kind: 'board'; i: number }

const MAX_PLAYERS = 6
const notNull = (c: Card | null): c is Card => c !== null
const sameSlot = (a: Slot | null, b: Slot) =>
  !!a && a.kind === b.kind && a.i === b.i && (a.kind === 'board' || (b.kind === 'hand' && a.p === b.p))

function pct(x: number): string {
  if (x === 0) return '0%'
  if (x === 1) return '100%'
  if (x < 0.001) return '<0.1%'
  if (x > 0.999) return '>99.9%'
  return `${(x * 100).toFixed(1)}%`
}

const STREET = ['Preflop', 'Preflop', 'Preflop', 'Flop', 'Turn', 'River']

export function OddsCalculatorPage() {
  // Starts on the classic aces-vs-kings matchup so the page shows real numbers immediately.
  const [hands, setHands] = useState<(Card | null)[][]>(() => [parseCards('As Ah'), parseCards('Ks Kh')])
  const [board, setBoard] = useState<(Card | null)[]>([null, null, null, null, null])
  const [active, setActive] = useState<Slot | null>({ kind: 'board', i: 0 })

  const used = useMemo(() => new Set([...hands.flat(), ...board].filter(notNull)), [hands, board])
  const boardCards = board.filter(notNull)
  const handsComplete = hands.every((h) => h.every(notNull))
  const [attempt, setAttempt] = useState(0)
  const equity = useEquity(hands, board, attempt)

  const order: Slot[] = [
    ...hands.flatMap((_, p) => [0, 1].map((i) => ({ kind: 'hand' as const, p, i }))),
    ...board.map((_, i) => ({ kind: 'board' as const, i })),
  ]
  const cardAt = (s: Slot) => (s.kind === 'hand' ? hands[s.p][s.i] : board[s.i])

  function put(s: Slot, c: Card | null) {
    if (s.kind === 'hand') setHands((hs) => hs.map((h, p) => (p === s.p ? h.map((x, i) => (i === s.i ? c : x)) : h)))
    else setBoard((b) => b.map((x, i) => (i === s.i ? c : x)))
  }

  function pick(c: Card) {
    if (!active) return
    put(active, c)
    // Move to the next empty slot after this one.
    const start = order.findIndex((s) => sameSlot(active, s))
    const next = [...order.slice(start + 1), ...order.slice(0, start)].find((s) => (sameSlot(active, s) ? false : cardAt(s) === null))
    setActive(next ?? null)
  }

  function randomHands() {
    const deck = shuffled(remainingDeck(boardCards))
    setHands(hands.map((_, p) => [deck[p * 2], deck[p * 2 + 1]]))
    setActive(null)
  }

  function dealNext() {
    const filled = boardCards.length
    const target = filled < 3 ? 3 : Math.min(5, filled + 1)
    const deck = shuffled(remainingDeck(used))
    let k = 0
    const next = [...board]
    for (let i = 0; i < 5 && next.filter(notNull).length < target; i++) if (next[i] === null) next[i] = deck[k++]
    setBoard(next)
    setActive(null)
  }

  function addPlayer() {
    setHands((hs) => [...hs, [null, null]])
    setActive({ kind: 'hand', p: hands.length, i: 0 })
  }

  function removePlayer(p: number) {
    setHands((hs) => hs.filter((_, i) => i !== p))
    setActive(null)
  }

  // Showdown details once all five board cards are out.
  const showdown = useMemo(() => {
    if (!handsComplete || boardCards.length !== 5) return null
    const bests = hands.map((h) => bestHand([...(h as Card[]), ...boardCards]))
    const top = Math.max(...bests.map((b) => b.score))
    const winners = bests.flatMap((b, p) => (b.score === top ? [p] : []))
    const others = bests.filter((b) => b.score !== top).map((b) => b.score)
    const reason = winners.length > 1 ? explainComparison(top, top) : explainComparison(top, Math.max(...others))
    const highlight = new Set(winners.flatMap((p) => bests[p].cards))
    return { bests, winners, reason, highlight }
  }, [handsComplete, hands, boardCards])

  const result = equity.status === 'done' ? equity.result : null
  const activeLabel = active
    ? active.kind === 'hand'
      ? `Player ${active.p + 1}, card ${active.i + 1}`
      : `Board card ${active.i + 1} (${active.i < 3 ? 'flop' : active.i === 3 ? 'turn' : 'river'})`
    : null
  const activeCard = active ? cardAt(active) : null

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Link to="/learn" className="text-sm font-semibold text-emerald hover:underline">
          ← Learn
        </Link>
        <PageHeader title="Odds calculator" subtitle="Pick cards for each player and the board. Riverline checks every way the remaining cards can come." />
      </div>

      {/* The felt */}
      <section
        className="relative overflow-hidden rounded-[2rem] border border-emerald/30 p-4 shadow-inner md:p-6"
        style={{
          background: 'radial-gradient(120% 90% at 50% 0%, #1d6b4b 0%, #155238 45%, #0f3a29 100%)',
          boxShadow: 'inset 0 0 0 6px rgba(0,0,0,0.18), inset 0 0 60px rgba(0,0,0,0.35)',
        }}
      >
        <div className="grid gap-5 text-[#ede7d6]">
          <div className="grid justify-items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4b062]">
              {STREET[boardCards.length]} · Board
            </span>
            <div className="flex gap-1.5 sm:gap-2">
              {board.map((c, i) => (
                <SlotButton
                  key={i}
                  card={c}
                  size="md"
                  active={sameSlot(active, { kind: 'board', i })}
                  highlight={!!(c !== null && showdown?.highlight.has(c))}
                  dim={!!(c !== null && showdown && !showdown.highlight.has(c))}
                  label={`Board card ${i + 1}`}
                  onClick={() => setActive({ kind: 'board', i })}
                />
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={dealNext} disabled={boardCards.length === 5} className="inline-flex min-h-9 items-center rounded-full bg-black/25 px-4 text-xs font-semibold hover:bg-black/35 disabled:opacity-40">
                Deal {boardCards.length < 3 ? 'flop' : boardCards.length === 3 ? 'turn' : 'river'}
              </button>
              <button type="button" onClick={() => { setBoard([null, null, null, null, null]); setActive({ kind: 'board', i: 0 }) }} disabled={boardCards.length === 0} className="inline-flex min-h-9 items-center rounded-full bg-black/25 px-4 text-xs font-semibold hover:bg-black/35 disabled:opacity-40">
                Clear board
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {hands.map((h, p) => {
              const res = result?.players[p]
              const complete = h.every(notNull)
              const label = complete ? bestHand([...(h as Card[]), ...boardCards]).label.full : 'Pick two cards'
              const isWinner = showdown?.winners.includes(p)
              return (
                <div key={p} className={cx('grid gap-2 rounded-2xl bg-black/20 p-3', isWinner && 'ring-2 ring-[#d4b062]')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      Player {p + 1}
                      {isWinner && <span className="ml-2 text-[#d4b062]">{showdown!.winners.length > 1 ? 'Splits' : 'Wins'}</span>}
                    </span>
                    {hands.length > 2 && (
                      <button type="button" onClick={() => removePlayer(p)} className="text-xs text-[#ede7d6]/70 hover:text-[#ede7d6]" aria-label={`Remove player ${p + 1}`}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {h.map((c, i) => (
                        <SlotButton
                          key={i}
                          card={c}
                          size="sm"
                          active={sameSlot(active, { kind: 'hand', p, i })}
                          highlight={!!(c !== null && showdown?.highlight.has(c) && isWinner)}
                          dim={!!(showdown && !isWinner)}
                          label={`Player ${p + 1}, card ${i + 1}`}
                          onClick={() => setActive({ kind: 'hand', p, i })}
                        />
                      ))}
                    </div>
                    <div className="grid min-w-0 flex-1 gap-1">
                      <span className="font-display text-2xl font-bold tabular leading-none">{res ? pct(res.equity) : '—'}</span>
                      <span className="truncate text-xs text-[#ede7d6]/75">{label}</span>
                    </div>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-black/30" aria-hidden>
                    {res && (
                      <>
                        <span className="bg-[#3dd68c] transition-all duration-500" style={{ width: `${res.win * 100}%` }} />
                        <span className="bg-[#d4b062] transition-all duration-500" style={{ width: `${res.tie * 100}%` }} />
                      </>
                    )}
                  </div>
                  {res && (
                    <span className="text-[11px] text-[#ede7d6]/75 tabular">
                      Win {pct(res.win)} · Split {pct(res.tie)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {hands.length < MAX_PLAYERS && (
            <button type="button" onClick={addPlayer} className="inline-flex min-h-9 items-center justify-self-center rounded-full border border-dashed border-[#ede7d6]/40 px-4 text-xs font-semibold hover:border-[#ede7d6]/80">
              + Add player
            </button>
          )}
        </div>
      </section>

      {/* Status and explanation */}
      <div className="grid gap-1 rounded-2xl border border-line bg-surface p-4 text-sm" aria-live="polite">
        {showdown ? (
          <>
            <span className="font-semibold">
              {showdown.winners.length > 1
                ? `Split pot between ${showdown.winners.map((p) => `Player ${p + 1}`).join(' and ')}: ${showdown.bests[showdown.winners[0]].label.full}.`
                : `Player ${showdown.winners[0] + 1} wins with ${showdown.bests[showdown.winners[0]].label.full}.`}
            </span>
            <span className="text-muted">{showdown.reason} The highlighted cards are the winning five.</span>
          </>
        ) : equity.status === 'running' ? (
          <span className="text-muted">
            Checking {equity.total.toLocaleString('en-US')} possible boards… {equity.total ? Math.round((equity.done / equity.total) * 100) : 0}%
          </span>
        ) : equity.status === 'done' ? (
          <span className="text-muted">
            <span className="font-semibold text-fg">Exact odds.</span> Checked all {equity.result.total.toLocaleString('en-US')} possible{' '}
            {boardCards.length === 4 ? 'river cards' : 'ways to complete the board'}. Split pot chance: {pct(equity.result.splitRate)}.
          </span>
        ) : equity.status === 'error' ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-neg">{equity.message}</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-emerald hover:underline">
              Try again
            </button>
          </span>
        ) : (
          <span className="text-muted">Give every player two cards to see their odds.</span>
        )}
      </div>

      {/* Card picker */}
      <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            {activeLabel ? (
              <>
                Choose a card for <span className="text-emerald">{activeLabel}</span>
              </>
            ) : (
              <span className="text-muted">Tap a card spot on the table to change it</span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {active && activeCard !== null && (
              <Button size="sm" variant="ghost" onClick={() => put(active, null)}>
                Remove {cardName(activeCard)}
              </Button>
            )}
            <Button size="sm" onClick={randomHands}>
              Random hands
            </Button>
          </div>
        </div>
        <CardPicker used={used} onPick={pick} disabled={!active} />
      </section>

      <p className="text-xs text-muted">
        Odds assume every player stays in to showdown (all-in). For learning only: hands are fictional and nothing is wagered.
      </p>
    </div>
  )
}

function SlotButton({
  card,
  size,
  active,
  highlight,
  dim,
  label,
  onClick,
}: {
  card: Card | null
  size: 'sm' | 'md'
  active: boolean
  highlight?: boolean
  dim?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('rounded-lg transition-transform', active && 'ring-2 ring-[#d4b062] ring-offset-2 ring-offset-[#155238]')}
    >
      <span aria-hidden>
        <PlayingCard card={card} size={size} highlight={highlight} dim={dim} />
      </span>
      <span className="sr-only">{card === null ? `${label}: empty` : `${label}: ${cardName(card)}`}</span>
    </button>
  )
}
