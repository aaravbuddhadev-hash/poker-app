import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
