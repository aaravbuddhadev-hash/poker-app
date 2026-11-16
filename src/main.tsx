import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts ship with the app (no requests to Google), so they work offline and nothing is shared with a third party.
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.tsx'
import { clearReloadFlag, reloadForUpdate } from './components/ErrorBoundary'
import { hideLaunchScreen, startNative } from './native/native'

// A screen file from an older version failed to load: reload once to get the new version.
window.addEventListener('vite:preloadError', (e) => {
  if (reloadForUpdate()) e.preventDefault()
})
// After a stable start, allow that one reload again for a future update.
setTimeout(clearReloadFlag, 30_000)

// In the iOS app, saved data is restored from native storage before the first render.
void startNative().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Fade out the branded splash from index.html shortly after the app mounts
  // (and the iOS launch screen with it). A plain timer, not
  // requestAnimationFrame, so it also clears in background tabs.
  const splash = document.getElementById('splash')
  setTimeout(() => {
    void hideLaunchScreen()
    splash?.classList.add('hide')
    setTimeout(() => splash?.remove(), 400)
  }, 300)
})
