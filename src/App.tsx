import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { DailyPuzzlePage } from './pages/DailyPuzzlePage'
import { HomePage } from './pages/HomePage'
import { GlossaryPage } from './pages/learn/GlossaryPage'
import { HandRankingsPage } from './pages/learn/HandRankingsPage'
import { LessonPage } from './pages/learn/LessonPage'
import { QuizHubPage } from './pages/learn/QuizHubPage'
import { QuizPlayPage } from './pages/learn/QuizPlayPage'
import { RulesGuidePage } from './pages/learn/RulesGuidePage'
import { LearningProvider } from './state/LearningProvider'
import { ProgressProvider } from './state/ProgressProvider'
import { LearnPage } from './pages/learn/LearnPage'
import { OddsCalculatorPage } from './pages/learn/OddsCalculatorPage'
import { ProfilePage } from './pages/ProfilePage'
import { SessionsPage } from './pages/SessionsPage'
import { SessionFormProvider } from './state/SessionFormProvider'
import { SessionsProvider } from './state/SessionsProvider'
import { SettingsProvider } from './state/SettingsProvider'
import { ToastProvider } from './state/ToastProvider'

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <SessionsProvider>
          <LearningProvider>
          <ProgressProvider>
          <SessionFormProvider>
            {/* Hash routing works on any static host, including GitHub Pages. */}
            <HashRouter>
              <Routes>
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
          </ProgressProvider>
          </LearningProvider>
        </SessionsProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}
