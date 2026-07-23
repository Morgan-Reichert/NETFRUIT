import { useEffect, useState } from 'react'
import { ChevronDown } from './icons'
import { useAuth } from '../lib/auth'
import { avatarUrl, useProfiles } from '../lib/profiles'
import { enablePush, isPushEnabled, pushBlockedReason, pushSupported } from '../lib/push'

const LINKS = ['Home', 'Series', 'New & Ripe', 'My Basket', 'Categories']

export default function Navbar({ onAuthClick, onSearchClick }: { onAuthClick: () => void; onSearchClick: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('Home')
  const [menu, setMenu] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const { active: profile, switchProfile } = useProfiles()

  useEffect(() => { isPushEnabled().then(setPushOn) }, [])
  const toggleNotifs = async () => {
    if (pushOn) return
    const blocked = pushBlockedReason()
    if (blocked) { setPushMsg(blocked); return }
    setPushMsg('Activation…')
    const r = await enablePush()
    if (r.ok) { setPushOn(true); setPushMsg('Notifications activées ✓') }
    else setPushMsg(r.error ?? 'Échec de l’activation.')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-ink-950/85 backdrop-blur-xl border-b border-white/5'
          : 'bg-gradient-to-b from-black/80 via-black/30 to-transparent'
      }`}
    >
      <nav className="pad-x-nav mx-auto flex h-16 max-w-[1600px] items-center gap-6 sm:h-20">
        {/* Logo */}
        <a href="#top" className="flex shrink-0 items-center gap-2">
          <img
            src="/brand/netfruit-mini.png"
            alt="NETFRUIT"
            className="h-9 w-auto drop-shadow-[0_2px_8px_rgba(255,39,64,0.35)] sm:h-10"
          />
          <img
            src="/brand/netfruit-long.png"
            alt="NETFRUIT"
            className="hidden h-6 w-auto brightness-125 saturate-150 drop-shadow-[0_0_14px_rgba(255,39,64,0.45)] sm:block"
          />
        </a>

        {/* Links */}
        <ul className="hidden items-center gap-5 text-sm lg:flex">
          {LINKS.map((l) => (
            <li key={l}>
              <button
                onClick={() => setActive(l)}
                className={`relative py-1 transition-colors ${
                  active === l
                    ? 'font-semibold text-cream'
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                {l}
                {active === l && (
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-fruit-red-bright" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-4">
          {/* Search */}
          <button
            aria-label="Search"
            onClick={onSearchClick}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-cream/70 transition hover:border-white/25 hover:text-cream"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="hidden md:inline">Search fruits…</span>
          </button>

          {/* Bell */}
          <button aria-label="Notifications" className="relative text-cream/70 transition hover:text-cream">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-fruit-red-bright ring-2 ring-ink-950" />
          </button>

          {/* Profile + auth */}
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-1.5">
              <img
                src={avatarUrl(profile?.avatar ?? 'strawberry')}
                alt={profile?.name ?? 'Profile'}
                className="h-8 w-8 rounded-md object-cover shadow-lg ring-1 ring-white/15"
              />
              <ChevronDown size={12} className="hidden text-cream/70 sm:block" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-11 z-20 w-60 overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                    <img src={avatarUrl(profile?.avatar ?? 'strawberry')} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream">{profile?.name ?? 'Profile'}</p>
                      <p className="truncate text-xs text-cream/50">{user ? user.email : 'Not synced'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMenu(false); switchProfile() }}
                    className="w-full px-4 py-2.5 text-left text-sm text-cream/80 transition hover:bg-white/5 hover:text-cream"
                  >
                    Switch profile
                  </button>
                  <button
                    onClick={toggleNotifs}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-cream/80 transition hover:bg-white/5 hover:text-cream"
                  >
                    <span>Notifications</span>
                    <span className={pushOn ? 'text-lime' : 'text-cream/40'}>
                      {pushOn ? 'On' : pushSupported() ? 'Enable' : 'Setup'}
                    </span>
                  </button>
                  {pushMsg && (
                    <p className="px-4 pb-3 pt-0 text-xs leading-snug text-cream/55">{pushMsg}</p>
                  )}
                  {user ? (
                    <button
                      onClick={() => { setMenu(false); signOut() }}
                      className="w-full px-4 py-2.5 text-left text-sm text-cream/80 transition hover:bg-white/5 hover:text-cream"
                    >
                      Sign out ({'cloud sync off'})
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMenu(false); onAuthClick() }}
                      className="w-full px-4 py-2.5 text-left text-sm text-cream/80 transition hover:bg-white/5 hover:text-cream"
                    >
                      Sign in to sync
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
