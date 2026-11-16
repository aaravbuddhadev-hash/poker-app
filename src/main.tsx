import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { clearReloadFlag, reloadForUpdate } from './components/ErrorBoundary'

// A screen file from an older version failed to load: reload once to get the new version.
window.addEventListener('vite:preloadError', (e) => {
  if (reloadForUpdate()) e.preventDefault()
})
// After a stable start, allow that one reload again for a future update.
setTimeout(clearReloadFlag, 30_000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Fade out the branded splash from index.html shortly after the app mounts.
// A plain timer (not requestAnimationFrame) so it also clears in background tabs.
const splash = document.getElementById('splash')
if (splash) {
  setTimeout(() => {
    splash.classList.add('hide')
    setTimeout(() => splash.remove(), 400)
  }, 300)
}
