import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './lib/store'
import { AuthProvider } from './lib/auth'
import { ProfilesProvider, useProfiles } from './lib/profiles'
import ProfileGate from './components/ProfileGate'

function Shell() {
  const { activeId } = useProfiles()
  if (!activeId) return <ProfileGate />
  return (
    <UserProvider key={activeId} profileId={activeId}>
      <App />
    </UserProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProfilesProvider>
        <Shell />
      </ProfilesProvider>
    </AuthProvider>
  </StrictMode>,
)

// Register the PWA service worker (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
