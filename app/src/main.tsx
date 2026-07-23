import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './lib/store'
import { AuthProvider } from './lib/auth'
import { ProfilesProvider, useProfiles } from './lib/profiles'
import { useProfilesSync } from './lib/sync'
import ProfileGate from './components/ProfileGate'
import ErrorBoundary from './components/ErrorBoundary'
import StudioApp from './studio/StudioApp'

function Shell() {
  const { activeId } = useProfiles()
  useProfilesSync() // keep the "Who's watching" list in sync across devices
  if (!activeId) return <ProfileGate />
  return (
    <UserProvider key={activeId} profileId={activeId}>
      <App />
    </UserProvider>
  )
}

// Creator Studio lives at /studio (same app, shared auth — later mapped to
// creator.netfruit.fun). It needs auth but NOT a viewer "who's watching" profile.
const isStudio = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {isStudio ? (
          <StudioApp />
        ) : (
          <ProfilesProvider>
            <Shell />
          </ProfilesProvider>
        )}
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Register the PWA service worker (production only) and reload once when a new
// version takes control, so an updated deploy never gets stuck behind a stale SW.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
