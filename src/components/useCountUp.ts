import { useEffect, useRef, useState } from 'react'

/** Animate an integer from its previous value to `target`. Respects reduced motion. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target)
  const from = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    if (reduce || start === target) {
      setValue(target)
      from.current = target
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      // Stay on whole cents during the animation so formatting never breaks.
      setValue(Math.round(start + (target - start) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [target, durationMs])

  return value
}
