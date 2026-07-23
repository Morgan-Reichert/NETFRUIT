import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './lib/store'
import { AuthProvider } from './lib/auth'
import { ProfilesProvider, useProfiles } from './lib/profiles'
import { WalletProvider } from './lib/wallet'
import { useProfilesSync } from './lib/sync'
import ProfileGate from './components/ProfileGate'
import ErrorBoundary from './components/ErrorBoundary'
import StudioApp from './studio/StudioApp'
import CreatorPage from './CreatorPage'

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

// Route by path: /studio = Creator Studio, /c/<handle> = public creator page,
// everything else = the viewer app. Studio/creator pages need auth but NOT a
// viewer "who's watching" profile.
const path = typeof window !== 'undefined' ? window.location.pathname : '/'
const isStudio = path.startsWith('/studio')
const isCreatorPage = path.startsWith('/c/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {isStudio ? (
          <StudioApp />
        ) : isCreatorPage ? (
          <CreatorPage />
        ) : (
          <WalletProvider>
            <ProfilesProvider>
              <Shell />
            </ProfilesProvider>
          </WalletProvider>
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
