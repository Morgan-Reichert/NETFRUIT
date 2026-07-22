import { useEffect, useState } from 'react'
import { registerDynamic, type Series } from '../data/series'

/**
 * Loads AI-generated titles from /catalog.json (written by the generation
 * agent) and registers them into the runtime series registry. Returns a
 * version counter that bumps once loaded so the feed recomputes.
 */
export function useCatalog(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/catalog.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Series[]) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return
        registerDynamic(list)
        setVersion((v) => v + 1)
      })
      .catch(() => {
        /* no catalog yet — built-in series only */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return version
}
