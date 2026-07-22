import { useEffect, useState } from 'react'
import { ChevronDown, UserIcon } from './icons'
import { useAuth } from '../lib/auth'

const LINKS = ['Home', 'Series', 'New & Ripe', 'My Basket', 'Categories']

export default function Navbar({ onAuthClick }: { onAuthClick: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('Home')
  const [menu, setMenu] = useState(false)
  const { user, signOut } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-ink-950/85 backdrop-blur-xl border-b border-white/5'
          : 'bg-gradient-to-b from-black/80 via-black/30 to-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:h-20 sm:px-10">
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

          {/* Auth */}
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-1.5">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-strawberry to-orange text-sm font-bold uppercase text-white shadow-lg">
                  {(user.email ?? '?')[0]}
                </span>
                <ChevronDown size={12} className="hidden text-cream/70 sm:block" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl">
                    <div className="border-b border-white/5 px-4 py-3">
                      <p className="text-xs text-cream/50">Signed in as</p>
                      <p className="truncate text-sm font-semibold text-cream">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setMenu(false); signOut() }}
                      className="w-full px-4 py-2.5 text-left text-sm text-cream/80 transition hover:bg-white/5 hover:text-cream"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="flex items-center gap-1.5 rounded-full bg-fruit-red-bright px-4 py-1.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              <UserIcon size={16} /> Sign In
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
