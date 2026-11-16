/// Runs exact equity enumeration off the main thread so the UI stays smooth.
import { calculateEquity, type EquityInput } from './equity'

interface Request extends EquityInput {
  id: number
}

const ctx = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((e: MessageEvent<Request>) => void) | null
}

ctx.onmessage = (e) => {
  const { id, hands, board } = e.data
  try {
    const result = calculateEquity({ hands, board }, (done, total) => ctx.postMessage({ id, type: 'progress', done, total }))
    ctx.postMessage({ id, type: 'result', result })
  } catch (err) {
    ctx.postMessage({ id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
