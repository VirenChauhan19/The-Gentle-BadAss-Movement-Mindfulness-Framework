import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)

// Keep every user on the latest deploy, not just first-time visitors.
// The new service worker auto-activates (skipWaiting + clientsClaim) and,
// with autoUpdate, the page reloads itself once the new version takes over.
// We also poll for updates so long-lived sessions (installed PWAs, tabs left
// open) pick up new deploys instead of waiting on the browser's ~24h check.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const checkForUpdate = () => registration.update()
    setInterval(checkForUpdate, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
    window.addEventListener('online', checkForUpdate)
  },
})
