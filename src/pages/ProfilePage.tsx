import { useState } from 'react'
import { Link } from 'react-router'
import { DownloadIcon } from '../components/icons'
import { LESSONS } from '../learn/lessons'
import { AchievementBadge } from '../components/AchievementBadge'
import { useLearning } from '../state/LearningProvider'
import { useProgress } from '../state/ProgressProvider'
import { Button, Card, inputCls, MoneyText, PageHeader, Segmented, StatTile } from '../components/ui'
import { summarize } from '../domain/analytics'
import { sessionsToCsv } from '../lib/csv'
import { CURRENCIES, type CurrencyCode } from '../lib/money'
import { useSessions } from '../state/SessionsProvider'
import { useSettings } from '../state/SettingsProvider'
import { useToast } from '../state/ToastProvider'

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ProfilePage() {
  const { sessions, isDemo, clearAll, today } = useSessions()
  const { settings, update } = useSettings()
  const toast = useToast()
  const [confirmClear, setConfirmClear] = useState(false)
  const summary = summarize(sessions)
  const { completed } = useLearning()
  const { quiz, achievements } = useProgress()
  const lessonsDone = LESSONS.filter((l) => completed.has(l.id)).length

  return (
    <div className="grid gap-5">
      <PageHeader title="Profile" subtitle={isDemo ? 'Showing demo data' : 'Your records and settings'} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Sessions" value={summary.count} />
        <StatTile label="Lifetime net" value={<MoneyText cents={summary.netCents} />} />
        <StatTile label="Hours recorded" value={(summary.totalMinutes / 60).toFixed(1)} />
        <StatTile label="Positive rate" value={summary.positiveRate === null ? '—' : `${Math.round(summary.positiveRate * 100)}%`} />
      </div>

      <Card title="Learning">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">
              <strong className="font-display text-xl">{lessonsDone}</strong> of {LESSONS.length} rules lessons complete
            </span>
            <Link to="/learn/rules" className="text-sm font-semibold text-emerald hover:underline">
              {lessonsDone === LESSONS.length ? 'Review lessons' : 'Keep learning'} →
            </Link>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Rules lessons complete" aria-valuemin={0} aria-valuemax={LESSONS.length} aria-valuenow={lessonsDone}>
            <div className="h-full rounded-full bg-emerald" style={{ width: `${(lessonsDone / LESSONS.length) * 100}%` }} />
          </div>
          <span className="text-sm text-muted">
            Quizzes: {quiz.completed} completed
            {quiz.accuracy !== null && ` · ${Math.round(quiz.accuracy * 100)}% of ${quiz.answered} answers right`}
            {quiz.best && ` · best ${quiz.best.correct}/${quiz.best.total}`}
          </span>
        </div>
      </Card>

      <Card title={`Achievements · ${achievements.filter((a) => a.unlocked).length} of ${achievements.length}`}>
        {/* 10 badges: 2 or 5 columns so every row is full. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {achievements.map((a) => (
            <AchievementBadge key={a.id} a={a} />
          ))}
        </div>
      </Card>

      <Card title="Settings">
        <div className="grid gap-5">
          <Row label="Currency" hint="Changes how amounts are shown. Saved amounts are not converted.">
            <select aria-label="Currency" value={settings.currency} onChange={(e) => update({ currency: e.target.value as CurrencyCode })} className={`${inputCls} w-full sm:w-56`}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Theme">
            <Segmented
              label="Theme"
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
            />
          </Row>
          <Row label="Demo mode" hint="Explore the app with fictional sessions. Your own records are kept separately and hidden while demo mode is on.">
            <button
              type="button"
              role="switch"
              aria-checked={settings.demoMode}
              aria-label="Demo mode"
              onClick={() => update({ demoMode: !settings.demoMode })}
              className={`relative h-7 w-12 rounded-full transition-colors ${settings.demoMode ? 'bg-gold' : 'bg-surface-2 border border-line'}`}
            >
              <span className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow transition-all ${settings.demoMode ? 'left-6' : 'left-1'}`} />
            </button>
          </Row>
        </div>
      </Card>

      <Card title="Your data">
        <div className="grid gap-5">
          <Row label="Export sessions" hint="Download every session as a CSV file: date, net result, game type, duration and notes.">
            <Button
              disabled={sessions.length === 0}
              onClick={() => {
                download(`${isDemo ? 'riverline-demo-sessions' : 'riverline-sessions'}-${today}.csv`, sessionsToCsv(sessions))
                toast(`Exported ${sessions.length} sessions`)
              }}
            >
              <DownloadIcon width={18} height={18} /> Export CSV
            </Button>
          </Row>
          <Row
            label={isDemo ? 'Reset demo data' : 'Delete all sessions'}
            hint={isDemo ? 'Restores the original demo sessions.' : 'Permanently removes every session saved on this device. Export first if you want a copy.'}
          >
            {confirmClear ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await clearAll()
                    setConfirmClear(false)
                    toast(isDemo ? 'Demo data reset' : 'All sessions deleted')
                  }}
                >
                  {isDemo ? 'Yes, reset' : `Yes, delete ${sessions.length}`}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="text-neg hover:text-neg" disabled={sessions.length === 0} onClick={() => setConfirmClear(true)}>
                {isDemo ? 'Reset' : 'Delete all'}
              </Button>
            )}
          </Row>
        </div>
      </Card>

      <Card title="Account">
        <p className="text-sm text-muted max-w-prose">
          Your sessions are saved in this browser on this device, and nothing is sent anywhere. Sign-in and cloud sync, so you can use Riverline on several
          devices, are the next backend step.
        </p>
      </Card>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-0.5 min-w-0 max-w-md">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
