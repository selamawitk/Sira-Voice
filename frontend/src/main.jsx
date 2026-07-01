import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  const url = import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw'
  navigator.serviceWorker.register(url, {
    scope: '/',
    type: import.meta.env.PROD ? 'classic' : 'module',
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
