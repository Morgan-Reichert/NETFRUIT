import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

/** Catches render crashes so the app shows a message + recovery instead of a blank screen. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  async hardReset() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch { /* ignore */ }
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0c060a', color: '#f7ede2', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🍓</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '12px 0 6px' }}>NETFRUIT hit a snag</h1>
          <p style={{ opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
            Something crashed while loading. A quick refresh usually fixes it.
          </p>
          <pre style={{ marginTop: 12, textAlign: 'left', fontSize: 11, opacity: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => this.hardReset()}
            style={{ marginTop: 18, background: '#16b8ad', color: '#04211f', border: 0, borderRadius: 999, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Reload NETFRUIT
          </button>
        </div>
      </div>
    )
  }
}
