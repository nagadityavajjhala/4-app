import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initMessaging } from './lib/notifications'

// GitHub Pages SPA redirect (from public/404.html)
;(function () {
  const l = window.location
  if (l.search.startsWith('?/')) {
    const restored =
      l.search
        .slice(2)
        .split('&')
        .map(s => s.replace(/~and~/g, '&'))
        .join('?') + l.hash
    window.history.replaceState(null, '', l.pathname + restored)
  }
  const redirect = sessionStorage.getItem('redirect')
  if (redirect) {
    sessionStorage.removeItem('redirect')
    window.history.replaceState(null, '', redirect)
  }
})()

// Register Firebase Cloud Messaging service worker
if ('serviceWorker' in navigator) {
  const swUrl = import.meta.env.BASE_URL + 'firebase-messaging-sw.js'
  navigator.serviceWorker.register(swUrl).catch(() => {})
}

initMessaging()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
