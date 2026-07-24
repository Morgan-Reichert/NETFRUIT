import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { myActiveSanction } from './lib/admin'
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
import AdminApp from './admin/AdminApp'

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
  const { user, loading, signOut } = useAuth()
  const [sanction, setSanction] = useState<{ kind: string; reason: string | null; expires_at: string | null } | null | undefined>(undefined)
  useEffect(() => {
    if (!user) { setSanction(null); return }
    myActiveSanction().then(setSanction)
  }, [user])

  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950 text-cream/60">…</div>
  if (!user) return <AuthScreen />
  if (sanction === undefined) return <div className="grid min-h-screen place-items-center bg-ink-950 text-cream/60">…</div>
  if (sanction) {
    const banned = sanction.kind === 'ban'
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 px-6 text-center text-cream">
        <div className="max-w-md">
          <img src="/brand/netfruit-long.png" alt="NETFRUIT" className="mx-auto mb-6 h-8 w-auto" />
          <h1 className="font-display text-2xl font-extrabold">{banned ? 'Compte banni' : 'Compte suspendu'}</h1>
          <p className="mt-3 text-cream/70">
            {banned ? 'Ton compte a été banni de NETFRUIT.' : 'Ton compte est temporairement suspendu.'}
            {sanction.reason ? <><br /><span className="text-cream/50">Motif : {sanction.reason}</span></> : null}
            {sanction.expires_at ? <><br /><span className="text-cream/50">Jusqu’au {new Date(sanction.expires_at).toLocaleDateString('fr-FR')}</span></> : null}
          </p>
          <p className="mt-4 text-sm text-cream/50">Tu peux contester à <a href="mailto:contact@netfruit.fun" className="text-fruit-red-bright">contact@netfruit.fun</a>.</p>
          <button onClick={signOut} className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-sm text-cream/70 hover:border-white/40">Déconnexion</button>
        </div>
      </div>
    )
  }
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
const isAdmin = path.startsWith('/admin')
const isCreatorPage = path.startsWith('/c/')
const isReset = path.startsWith('/reset-password')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {isReset ? (
          <ResetPassword />
        ) : isAdmin ? (
          <AdminApp />
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
