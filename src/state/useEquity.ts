import { useEffect, useRef, useState } from 'react'
import type { Card } from '../poker/cards'
import { boardCount, type EquityResult } from '../poker/equity'

export type EquityState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number }
  | { status: 'done'; result: EquityResult }
  | { status: 'error'; message: string }

type Spot = (Card | null)[]

function parse(key: string) {
  const { hands, board } = JSON.parse(key) as { hands: Spot[]; board: Spot }
  const complete = hands.length >= 2 && hands.every((h) => h.every((c) => c !== null))
  return { complete, input: { hands: hands as Card[][], board: board.filter((c): c is Card => c !== null) } }
}

/**
 * Exact equity for complete hands, computed in a Web Worker.
 * - Every result is tagged with the cards it was computed for, so a result
 *   for an older board can never be shown next to a newer one.
 * - One worker is reused; it is only restarted to cancel a long calculation.
 */
export function useEquity(hands: Spot[], board: Spot, attempt = 0): EquityState {
  // `attempt` changes the key, so bumping it runs the same calculation again.
  const key = JSON.stringify({ hands, board, attempt })
  const [state, setState] = useState<{ key: string; value: EquityState }>({ key: '', value: { status: 'idle' } })
  const worker = useRef<Worker | null>(null)
  const busy = useRef(false)
  const requestId = useRef(0)

  useEffect(
    () => () => {
      worker.current?.terminate()
      worker.current = null
      busy.current = false
    },
    [],
  )

  useEffect(() => {
    const { complete, input } = parse(key)
    if (!complete) return
    if (busy.current && worker.current) {
      worker.current.terminate() // cancel the outdated calculation
      worker.current = null
    }
    try {
      worker.current ??= new Worker(new URL('../poker/equity.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      // Very old browsers, or a blocked worker: explain instead of crashing the screen.
      setState({ key, value: { status: 'error', message: 'This browser couldn’t start the odds calculator. Try an up-to-date browser.' } })
      return
    }
    const id = ++requestId.current
    busy.current = true
    const w = worker.current
    w.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.id !== id) return
      if (msg.type === 'progress') setState({ key, value: { status: 'running', done: msg.done, total: msg.total } })
      else {
        busy.current = false
        setState({ key, value: msg.type === 'result' ? { status: 'done', result: msg.result } : { status: 'error', message: msg.message } })
      }
    }
    w.onerror = () => {
      busy.current = false
      worker.current = null
      setState({ key, value: { status: 'error', message: 'The calculation stopped unexpectedly.' } })
    }
    w.postMessage({ id, ...input })
  }, [key])

  if (state.key === key) return state.value
  // Nothing computed for these exact cards yet.
  const { complete, input } = parse(key)
  return complete ? { status: 'running', done: 0, total: boardCount(input) } : { status: 'idle' }
}
