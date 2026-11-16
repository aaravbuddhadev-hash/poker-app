import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { CloseIcon, DownloadIcon } from '../components/icons'
import { LogoMark } from '../components/Logo'
import { cx, PageLoading } from '../components/ui'
import { LESSONS } from '../learn/lessons'
import { formatDate, formatDuration, formatMonth } from '../lib/dates'
import { formatMoney, type CurrencyCode } from '../lib/money'
import { renderRecapCard, saveImage, shareImage } from '../recap/exportCard'
import { buildRecap, recapYears, summaryLines, type Recap } from '../recap/yearInReview'
import { useLearning } from '../state/LearningProvider'
import { useProgress } from '../state/ProgressProvider'
import { useSessions } from '../state/SessionsProvider'
import { useSettings } from '../state/SettingsProvider'
import { useToast } from '../state/ToastProvider'

const SLIDE_MS = 6500
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Slide {
  id: string
  bg: string
  content: ReactNode
}

/** Counts from zero to `target` (whole cents) when the slide appears. */
function useCountFromZero(target: number, ms = 1600) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Land on the exact value even if animation frames are skipped.
    const done = window.setTimeout(() => setV(target), ms + 100)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(done)
    }
  }, [target, ms, reduce])
  return v
}

const Eyebrow = ({ children }: { children: ReactNode }) => <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4b062]">{children}</span>
const Big = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cx('font-display font-bold leading-[0.95] tracking-tight', className)}>{children}</span>
)

function NetSlide({ r, currency }: { r: Recap; currency: CurrencyCode }) {
  const v = useCountFromZero(r.sessions.netCents)
  const s = r.sessions
  return (
    <>
      <Eyebrow>The numbers</Eyebrow>
      <Big className={cx('text-[clamp(3rem,15vw,6rem)] tabular', s.netCents > 0 ? 'text-[#3dd68c]' : s.netCents < 0 ? 'text-[#f0675d]' : 'text-[#ede7d6]')}>
        {formatMoney(v, currency, { signed: true })}
      </Big>
      <p className="text-lg text-[#ede7d6]/85">
        net across {s.count} recorded session{s.count === 1 ? '' : 's'}
        {s.totalMinutes ? ` and ${(s.totalMinutes / 60).toFixed(1)} hours` : ''}.
      </p>
      <div className="grid grid-cols-3 gap-2 pt-2 text-center">
        {(
          [
            ['Up', s.positive, '#3dd68c'],
            ['Down', s.negative, '#f0675d'],
            ['Even', s.even, '#8f9a92'],
          ] as const
        ).map(([label, n, c]) => (
          <div key={label} className="rounded-2xl bg-black/25 p-3">
            <div className="font-display text-3xl font-bold tabular" style={{ color: c }}>
              {n}
            </div>
            <div className="text-xs text-[#ede7d6]/70">{label} sessions</div>
          </div>
        ))}
      </div>
    </>
  )
}

function buildSlides(r: Recap, currency: CurrencyCode): Slide[] {
  const s = r.sessions
  const l = r.learning
  const slides: Slide[] = []
  const when = r.isYearToDate ? 'so far this year' : `in ${r.year}`

  slides.push({
    id: 'intro',
    bg: 'radial-gradient(120% 90% at 20% 0%, #1f7350 0%, #123d2d 45%, #0f1412 100%)',
    content: (
      <>
        <LogoMark size={56} />
        <Eyebrow>Your year at the table{r.isYearToDate ? ' · year to date' : ''}</Eyebrow>
        <Big className="text-[clamp(5rem,28vw,11rem)] text-[#ede7d6]">{r.year}</Big>
        <p className="text-xl text-[#ede7d6]/85">
          {s.count
            ? `You recorded ${s.count} poker session${s.count === 1 ? '' : 's'} ${when}.`
            : r.hasLearning
              ? `No sessions recorded ${when}, but you kept learning.`
              : `Nothing recorded for ${r.year} yet.`}
        </p>
      </>
    ),
  })

  if (r.hasSessions) slides.push({ id: 'numbers', bg: 'linear-gradient(160deg, #0f1412 0%, #123d2d 100%)', content: <NetSlide r={r} currency={currency} /> })

  if (s.mostActiveMonth) {
    const max = Math.max(...s.months.map((m) => m.count), 1)
    const best = s.mostActiveMonth
    slides.push({
      id: 'month',
      bg: 'radial-gradient(100% 80% at 80% 100%, #3a2f17 0%, #1b1a12 45%, #0f1412 100%)',
      content: (
        <>
          <Eyebrow>Your most active month</Eyebrow>
          <Big className="text-[clamp(3.5rem,18vw,7rem)] text-[#d4b062]">{formatMonth(best.month, true).split(' ')[0]}</Big>
          <p className="text-lg text-[#ede7d6]/85">
            {best.count} session{best.count === 1 ? '' : 's'}, {formatMoney(best.netCents, currency, { signed: true })} net.
          </p>
          <div className="flex h-36 items-end gap-1.5 pt-4" aria-label="Sessions per month">
            {s.months.map((m, i) => (
              <div key={m.month} className="grid flex-1 justify-items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: (m.count / max) * 100 }}
                  transition={{ delay: 0.2 + i * 0.05, type: 'spring', stiffness: 160, damping: 20 }}
                  className={cx('w-full rounded-t-md', m.month === best.month ? 'bg-[#d4b062]' : 'bg-[#ede7d6]/25')}
                  style={{ minHeight: m.count ? 4 : 2 }}
                />
                <span className="text-[10px] text-[#ede7d6]/60">{MONTHS[i][0]}</span>
              </div>
            ))}
          </div>
        </>
      ),
    })
  }

  if (r.hasSessions) {
    slides.push({
      id: 'history',
      bg: 'linear-gradient(200deg, #123d2d 0%, #0f1412 70%)',
      content: (
        <>
          <Eyebrow>Your session history</Eyebrow>
          <Big className="text-[clamp(3rem,15vw,6rem)] text-[#ede7d6] tabular">{s.positiveRate === null ? '—' : `${Math.round(s.positiveRate * 100)}%`}</Big>
          <p className="text-lg text-[#ede7d6]/85">of your sessions finished up. Each square is one session, in order:</p>
          <div className="flex flex-wrap gap-1.5 pt-2" aria-label="Session outcomes in order">
            {s.outcomes.map((o, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(2, 0.15 + i * 0.025) }}
                className="size-4 rounded-[4px]"
                style={{ background: o === 'positive' ? '#3dd68c' : o === 'negative' ? '#f0675d' : '#8f9a92' }}
              />
            ))}
          </div>
          <div className="flex gap-4 pt-2 text-xs text-[#ede7d6]/70">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#3dd68c]" />Up</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#f0675d]" />Down</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#8f9a92]" />Even</span>
          </div>
        </>
      ),
    })
  }

  if (s.best) {
    const best = s.best
    slides.push({
      id: 'biggest',
      bg: 'radial-gradient(110% 80% at 50% 0%, #1f7350 0%, #0f1412 75%)',
      content: (
        <>
          <Eyebrow>Your biggest session</Eyebrow>
          <Big className="text-[clamp(3rem,16vw,6.5rem)] text-[#3dd68c] tabular">{formatMoney(best.netCents, currency, { signed: true })}</Big>
          <p className="text-lg text-[#ede7d6]/85">
            on {formatDate(best.date)}
            {best.gameType ? `, playing ${best.gameType}` : ''}
            {best.durationMinutes ? ` for ${formatDuration(best.durationMinutes)}` : ''}.
          </p>
          {s.topGameType && (
            <p className="text-sm text-[#ede7d6]/70">
              Most-recorded game: <strong className="text-[#ede7d6]">{s.topGameType.gameType}</strong> ({s.topGameType.count} sessions).
            </p>
          )}
          {s.averageMinutes && <p className="text-sm text-[#ede7d6]/70">Average session: {formatDuration(s.averageMinutes)}.</p>}
          {s.worst && (
            <p className="text-sm text-[#ede7d6]/70">
              Toughest session: {formatMoney(s.worst.netCents, currency, { signed: true })} on {formatDate(s.worst.date)}.
            </p>
          )}
        </>
      ),
    })
  }

  if (r.hasLearning) {
    const tiles = [
      l.puzzlesCompleted ? { big: String(l.puzzlesCompleted), label: `daily puzzle${l.puzzlesCompleted === 1 ? '' : 's'} solved`, sub: `${l.puzzleAccuracy!.toFixed(1)}% average accuracy` } : null,
      l.questionsAnswered ? { big: String(l.questionsAnswered), label: 'quiz questions answered', sub: `${Math.round(l.quizAccuracy! * 100)}% right` } : null,
      { big: `${l.lessonsCompleted}/${l.totalLessons}`, label: 'rules lessons completed', sub: 'all time' },
      { big: `${l.achievementsUnlocked}/${l.achievementsTotal}`, label: 'achievements unlocked', sub: 'all time' },
    ].filter((t) => t !== null)
    slides.push({
      id: 'knowledge',
      bg: 'linear-gradient(160deg, #1c2521 0%, #0f1412 60%, #123d2d 100%)',
      content: (
        <>
          <Eyebrow>Your poker knowledge</Eyebrow>
          <Big className="text-[clamp(2.5rem,11vw,4.5rem)] text-[#ede7d6]">You kept learning.</Big>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {tiles.map((t, i) => (
              <motion.div key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="rounded-2xl bg-black/25 p-4">
                <div className="font-display text-4xl font-bold tabular text-[#d4b062]">{t.big}</div>
                <div className="text-sm text-[#ede7d6]">{t.label}</div>
                <div className="text-xs text-[#ede7d6]/60">{t.sub}</div>
              </motion.div>
            ))}
          </div>
        </>
      ),
    })
  }
  return slides
}

export function YearInReviewPage() {
  const { year: yearParam } = useParams()
  const navigate = useNavigate()
  const { sessions, today, isDemo, loading } = useSessions()
  const { submissions, attempts, achievements } = useProgress()
  const { completed } = useLearning()
  const { settings, update } = useSettings()
  const toast = useToast()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [run, setRun] = useState(0)
  const [busy, setBusy] = useState(false)
  const [shownYear, setShownYear] = useState(yearParam)

  // Switching years starts the story over.
  if (shownYear !== yearParam) {
    setShownYear(yearParam)
    setIndex(0)
    setRun((n) => n + 1)
  }

  const years = useMemo(() => recapYears(today, sessions, submissions, attempts), [today, sessions, submissions, attempts])
  const year = Number(yearParam)
  const recap = useMemo(
    () =>
      buildRecap({
        year,
        today,
        sessions,
        puzzles: submissions,
        quizAttempts: attempts,
        lessonsCompleted: LESSONS.filter((x) => completed.has(x.id)).length,
        totalLessons: LESSONS.length,
        achievementsUnlocked: achievements.filter((a) => a.unlocked).length,
        achievementsTotal: achievements.length,
      }),
    [year, today, sessions, submissions, attempts, completed, achievements],
  )
  const hide = settings.hideAmountsInExports
  const lines = summaryLines(recap, settings.currency, hide)
  const slides = useMemo(() => buildSlides(recap, settings.currency), [recap, settings.currency])
  const total = slides.length + 1 // + the summary slide
  const last = index === total - 1

  const go = useCallback((d: number) => setIndex((i) => Math.max(0, Math.min(total - 1, i + d))), [total])

  // Auto-advance like a story, except on the last slide or while paused.
  useEffect(() => {
    if (paused || last) return
    const t = window.setTimeout(() => go(1), SLIDE_MS)
    return () => window.clearTimeout(t)
  }, [index, paused, last, go, run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') navigate('/profile')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, navigate])

  if (!Number.isInteger(year) || !years.includes(year)) return <Navigate to="/profile" replace />
  if (loading) return <PageLoading fullScreen />

  const filename = `riverline-${recap.year}${recap.isYearToDate ? '-so-far' : ''}-recap.png`
  const shareText = `My ${recap.year} on Riverline${recap.isYearToDate ? ' (so far)' : ''}: ${lines.map((l) => `${l.label} ${l.value}`).join(' · ')}`

  async function exportImage(share: boolean) {
    setBusy(true)
    try {
      const blob = await renderRecapCard(recap, lines, { isDemo, hideAmounts: hide })
      const outcome = share ? await shareImage(blob, filename, shareText) : await saveImage(blob, filename)
      if (outcome === 'downloaded') toast(share ? 'Sharing isn’t available in this browser, so the image was saved instead' : 'Recap image saved')
    } catch {
      toast('Couldn’t create the image. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const summary: Slide = {
    id: 'summary',
    bg: 'radial-gradient(120% 90% at 50% 0%, #1f7350 0%, #123d2d 40%, #0f1412 100%)',
    content: (
      <>
        <Eyebrow>Your year in one screen</Eyebrow>
        <div className="grid gap-4 rounded-3xl border border-[#d4b062]/30 bg-black/30 p-5">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-lg font-bold">Riverline</span>
            <span className="ml-auto text-xs text-[#ede7d6]/60">{recap.isYearToDate ? 'Year to date' : 'Full year'}</span>
          </div>
          <span className="font-display text-6xl font-bold leading-none">{recap.year}</span>
          {lines.length ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {lines.map((l) => (
                <div key={l.label} className="min-w-0">
                  <dt className="text-[11px] text-[#ede7d6]/60">{l.label}</dt>
                  <dd className="truncate font-display text-lg font-bold">{l.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-[#ede7d6]/70">Record sessions or play the daily puzzle to fill this card.</p>
          )}
          {(isDemo || hide) && <span className="text-[11px] text-[#ede7d6]/60">{[isDemo && 'Demo data', hide && 'Amounts hidden'].filter(Boolean).join(' · ')}</span>}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span id="hide-amounts-label">Hide amounts on the shared card</span>
          <button
            type="button"
            role="switch"
            aria-checked={hide}
            aria-labelledby="hide-amounts-label"
            onClick={() => update({ hideAmountsInExports: !hide })}
            className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', hide ? 'bg-[#1fa971]' : 'bg-white/20')}
          >
            <span className={cx('absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow transition-all', hide ? 'left-6' : 'left-1')} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !lines.length} onClick={() => exportImage(false)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1fa971] px-5 text-sm font-semibold text-[#07130e] disabled:opacity-50">
            <DownloadIcon width={18} height={18} /> Save image
          </button>
          <button type="button" disabled={busy || !lines.length} onClick={() => exportImage(true)} className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold disabled:opacity-50">
            Share
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex(0)
              setRun((n) => n + 1)
              setPaused(false)
            }}
            className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold"
          >
            Replay
          </button>
        </div>
        {years.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#ede7d6]/60">Other years:</span>
            {years
              .filter((y) => y !== recap.year)
              .map((y) => (
                <Link key={y} to={`/recap/${y}`} className="rounded-full border border-white/20 px-3 py-1 font-semibold hover:border-white/50">
                  {y}
                </Link>
              ))}
          </div>
        )}
      </>
    ),
  }

  const all = [...slides, summary]
  const slide = all[Math.min(index, all.length - 1)]

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden text-[#ede7d6]"
      style={{ background: slide.bg }}
      role="region"
      aria-roledescription="slideshow"
      aria-label={`${recap.year} Year in Review`}
    >
      {/* Story progress bars */}
      <div className="absolute inset-x-0 top-0 z-30 grid gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {all.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              {i < index && <div className="h-full w-full bg-white/90" />}
              {i === index && (
                <motion.div
                  key={`${index}-${run}-${paused}`}
                  className="h-full bg-white/90"
                  initial={{ width: last ? '100%' : '0%' }}
                  animate={{ width: paused && !last ? '0%' : '100%' }}
                  transition={{ duration: paused || last || reduce ? 0 : SLIDE_MS / 1000, ease: 'linear' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold">
            {recap.year} Year in Review{recap.isYearToDate ? ' · so far' : ''}
            {isDemo && <span className="ml-2 rounded-full bg-[#d4b062] px-2 py-0.5 text-[#0f1412]">Demo data</span>}
          </span>
          <div className="flex items-center gap-1">
            {!last && (
              <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-full px-2.5 py-1 font-semibold hover:bg-white/10" aria-pressed={paused}>
                {paused ? 'Play' : 'Pause'}
              </button>
            )}
            <Link to="/profile" className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Close Year in Review">
              <CloseIcon />
            </Link>
          </div>
        </div>
      </div>

      {/* Tap zones: left third goes back, the rest goes forward (the last slide has its own buttons). */}
      {!last && (
        <>
          <button type="button" aria-label="Previous slide" className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize" onClick={() => go(-1)} />
          <button type="button" aria-label="Next slide" className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize" onClick={() => go(1)} />
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${slide.id}-${run}`}
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          className={cx(
            'pointer-events-none relative mx-auto grid h-full max-w-md content-center gap-4 px-6 pb-16 pt-24',
            last && 'pointer-events-auto z-20 content-start overflow-y-auto pt-28',
          )}
        >
          {slide.content}
        </motion.div>
      </AnimatePresence>

      {last && index > 0 && (
        <button type="button" onClick={() => go(-1)} className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-30 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
          ← Back
        </button>
      )}
    </div>
  )
}
