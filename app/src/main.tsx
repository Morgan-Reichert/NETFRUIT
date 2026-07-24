import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './lib/store'
import { AuthProvider, useAuth } from './lib/auth'
import { ProfilesProvider, useProfiles } from './lib/profiles'
import { WalletProvider } from './lib/wallet'
import { useProfilesSync } from './lib/sync'
import ProfileGate from './components/ProfileGate'
import AuthScreen from './components/AuthScreen'
import ResetPassword from './components/ResetPassword'
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

// Account first: you sign in before anything, THEN pick a "who's watching"
// profile. No account → the sign-in / sign-up screen.
function ViewerRoot() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950 text-cream/60">…</div>
  if (!user) return <AuthScreen />
  return (
    <WalletProvider>
      <ProfilesProvider>
        <Shell />
      </ProfilesProvider>
    </WalletProvider>
  )
}

// Route by path: /studio = Creator Studio, /c/<handle> = public creator page,
// /reset-password = password recovery, everything else = the viewer app.
const path = typeof window !== 'undefined' ? window.location.pathname : '/'
const isStudio = path.startsWith('/studio')
const isCreatorPage = path.startsWith('/c/')
const isReset = path.startsWith('/reset-password')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {isReset ? (
          <ResetPassword />
        ) : isStudio ? (
          <StudioApp />
        ) : isCreatorPage ? (
          <CreatorPage />
        ) : (
          <ViewerRoot />
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
