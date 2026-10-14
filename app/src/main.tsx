import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CloudGate } from './components/CloudGate.tsx'
import { cloudEnabled } from './lib/cloud.ts'
import { useAppState } from './lib/store.ts'

function LocalApp() {
  const [state, update] = useAppState()
  return <App state={state} update={update} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {cloudEnabled ? <CloudGate /> : <LocalApp />}
  </StrictMode>,
)

// Offline support + "Add to Home Screen". Only in production builds so dev reloads stay simple.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}
