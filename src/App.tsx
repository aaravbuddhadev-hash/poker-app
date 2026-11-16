import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { LearningProvider } from './state/LearningProvider'
import { ProgressProvider } from './state/ProgressProvider'
import { SessionFormProvider } from './state/SessionFormProvider'
import { SessionsProvider } from './state/SessionsProvider'
import { SettingsProvider } from './state/SettingsProvider'
import { ToastProvider } from './state/ToastProvider'
import { AuthProvider, useAuth } from './state/AuthProvider'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { PageLoading } from './components/ui'
import { NewPasswordDialog } from './components/account/NewPasswordDialog'
import { ErrorBoundary } from './components/ErrorBoundary'

/**
 * Each screen is its own download, fetched the first time it's opened, so the
 * first visit only loads the shell and the home screen. Once the app is idle,
 * the rest are fetched in the background so later navigation is instant.
 */
const pageLoaders = {
  DailyPuzzlePage: () => import('./pages/DailyPuzzlePage').then((m) => ({ default: m.DailyPuzzlePage })),
  GlossaryPage: () => import('./pages/learn/GlossaryPage').then((m) => ({ default: m.GlossaryPage })),
  HandRankingsPage: () => import('./pages/learn/HandRankingsPage').then((m) => ({ default: m.HandRankingsPage })),
  LessonPage: () => import('./pages/learn/LessonPage').then((m) => ({ default: m.LessonPage })),
  QuizHubPage: () => import('./pages/learn/QuizHubPage').then((m) => ({ default: m.QuizHubPage })),
  QuizPlayPage: () => import('./pages/learn/QuizPlayPage').then((m) => ({ default: m.QuizPlayPage })),
  RulesGuidePage: () => import('./pages/learn/RulesGuidePage').then((m) => ({ default: m.RulesGuidePage })),
  LearnPage: () => import('./pages/learn/LearnPage').then((m) => ({ default: m.LearnPage })),
  OddsCalculatorPage: () => import('./pages/learn/OddsCalculatorPage').then((m) => ({ default: m.OddsCalculatorPage })),
  ProfilePage: () => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
  SessionsPage: () => import('./pages/SessionsPage').then((m) => ({ default: m.SessionsPage })),
  YearInReviewPage: () => import('./pages/YearInReviewPage').then((m) => ({ default: m.YearInReviewPage })),
}
const page = (name: keyof typeof pageLoaders) => lazy(pageLoaders[name])
const DailyPuzzlePage = page('DailyPuzzlePage')
const GlossaryPage = page('GlossaryPage')
const HandRankingsPage = page('HandRankingsPage')
const LessonPage = page('LessonPage')
const QuizHubPage = page('QuizHubPage')
const QuizPlayPage = page('QuizPlayPage')
const RulesGuidePage = page('RulesGuidePage')
const LearnPage = page('LearnPage')
const OddsCalculatorPage = page('OddsCalculatorPage')
const ProfilePage = page('ProfilePage')
const SessionsPage = page('SessionsPage')
const YearInReviewPage = page('YearInReviewPage')

function usePrefetchPages() {
  useEffect(() => {
    const prefetch = () => Object.values(pageLoaders).forEach((load) => void load().catch(() => {}))
    // Safari has no requestIdleCallback; a short delay does the same job there.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(prefetch, 2000)
    return () => clearTimeout(t)
  }, [])
}

/** Learning progress belongs to whoever is signed in: start fresh from their own data when that changes. */
function AccountScope({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <LearningProvider key={user?.id ?? 'guest'}>
      <ProgressProvider>
        {children}
        <NewPasswordDialog />
      </ProgressProvider>
    </LearningProvider>
  )
}

export default function App() {
  usePrefetchPages()
  return (
    <ErrorBoundary fullScreen>
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
        <SessionsProvider>
          <AccountScope>
          <SessionFormProvider>
            {/* Hash routing works on any static host, including GitHub Pages. */}
            <HashRouter>
              <Routes>
                {/* Full-screen story, outside the app shell's navigation. */}
                <Route
                  path="recap/:year"
                  element={
                    <Suspense fallback={<PageLoading fullScreen />}>
                      <YearInReviewPage />
                    </Suspense>
                  }
                />
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="sessions" element={<SessionsPage />} />
                  <Route path="puzzle" element={<DailyPuzzlePage />} />
                  <Route path="learn" element={<LearnPage />} />
                  <Route path="learn/hand-rankings" element={<HandRankingsPage />} />
                  <Route path="learn/odds" element={<OddsCalculatorPage />} />
                  <Route path="learn/rules" element={<RulesGuidePage />} />
                  <Route path="learn/rules/:lessonId" element={<LessonPage />} />
                  <Route path="learn/glossary" element={<GlossaryPage />} />
                  <Route path="learn/quizzes" element={<QuizHubPage />} />
                  <Route path="learn/quizzes/play" element={<QuizPlayPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </SessionFormProvider>
          </AccountScope>
        </SessionsProvider>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
    </ErrorBoundary>
  )
}
