import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
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
          <SessionFormProvider>
            {/* Hash routing works on any static host, including GitHub Pages. */}
            <HashRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="sessions" element={<SessionsPage />} />
                  <Route
                    path="puzzle"
                    element={
                      <ComingSoonPage
                        title="Daily Puzzle"
                        phase="Phases 5–6"
                        intro="A new Texas Hold'em probability challenge every day, the same for everyone. Every answer comes from an exact hand-evaluation engine; no probability is made up or hard-coded."
                        items={[
                          'An animated virtual poker table with realistic cards',
                          "Predict each player's chance to win with a slider, then see the exact answer",
                          'Ties and split pots counted correctly, using exact counts wherever practical',
                          'Streaks, average accuracy, best prediction and puzzle history',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="learn"
                    element={
                      <ComingSoonPage
                        title="Learn"
                        phase="Phases 4, 5 and 7"
                        intro="Everything you need to learn Texas Hold'em, built on the same card table and poker engine as the daily puzzle."
                        items={[
                          'All ten hand rankings with real card examples and tie-break rules',
                          'A step-by-step rules guide with lessons you can mark complete',
                          'A searchable poker glossary',
                          'Hand comparison tool with exact win, lose and tie odds',
                          'Quizzes by category and difficulty, with a review of missed questions',
                        ]}
                      />
                    }
                  />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </SessionFormProvider>
        </SessionsProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}
