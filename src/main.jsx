import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
