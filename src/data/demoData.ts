import { addDays, type IsoDate } from '../lib/dates'
import { GAME_TYPES, type GameType, type Session } from '../domain/session'

/**
 * Fictional sessions for demo mode. Generated from a fixed seed so the demo
 * looks the same every time, and stored under a separate key so it can never
 * mix with the user's real records.
 */
export function generateDemoSessions(today: IsoDate, seed = 3): Session[] {
  const rand = mulberry32(seed)
  const sessions: Session[] = []
  const weights: [GameType, number][] = [
    ["No-Limit Hold'em", 0.5],
    ['Home Game', 0.2],
    ['Tournament', 0.15],
    ['Pot-Limit Omaha', 0.1],
    ['Sit & Go', 0.05],
  ]
  const notes = [
    'Folded too much from the big blind.',
    'Good table, stayed patient.',
    'Ran into a set on the river.',
    'Played tight early, opened up late.',
    'Tried 3-betting light more often.',
    'Long session, got tired near the end.',
    'Friendly home game with the usual group.',
  ]

  let day = addDays(today, -420)
  let n = 0
  while (day <= today) {
    // Roughly 1-2 sessions a week, more on weekends.
    if (rand() < 0.2) {
      const gameType = pick(weights, rand())
      // Sum of uniforms approximates a bell curve; centered slightly positive.
      const swing = (rand() + rand() + rand() - 1.5) * 260 + 12
      const netCents = Math.round(swing / 5) * 500
      const durationMinutes = 60 + Math.round(rand() * 24) * 15
      const s: Session = {
        id: `demo_${++n}`,
        date: day,
        mode: 'simple',
        netCents,
        durationMinutes,
        gameType,
        createdAt: `${day}T20:00:00.000Z`,
        updatedAt: `${day}T20:00:00.000Z`,
      }
      if (rand() < 0.45) s.notes = notes[Math.floor(rand() * notes.length)]
      sessions.push(s)
    }
    day = addDays(day, 1)
  }
  return sessions
}

function pick(weights: [GameType, number][], r: number): GameType {
  let acc = 0
  for (const [g, w] of weights) {
    acc += w
    if (r < acc) return g
  }
  return GAME_TYPES[0]
}

/** Small, fast, seedable PRNG (public domain). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
