import { supabase } from './supabase'

const env = import.meta.env as Record<string, string | undefined>
const VAPID_PUBLIC = env.VITE_VAPID_PUBLIC_KEY

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC && !!supabase

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS reports as Mac; detect touch to disambiguate
    (navigator.platform === 'MacIntel' && (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1))

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true)

/**
 * Human explanation of why push can't be enabled here — or null if it can.
 * The big one: iOS only allows Web Push from a PWA installed to the Home Screen.
 */
export function pushBlockedReason(): string | null {
  if (pushSupported()) return null
  if (isIOS() && !isStandalone())
    return 'Sur iPhone/iPad : appuie sur Partager → « Sur l’écran d’accueil », puis rouvre NETFRUIT depuis l’icône pour activer les notifications.'
  if (typeof Notification === 'undefined' || !('PushManager' in window))
    return 'Ce navigateur ne supporte pas les notifications push.'
  return 'Notifications indisponibles ici.'
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function currentPermission(): Promise<NotificationPermission> {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied'
}

/** Ask permission, subscribe to push, and store the subscription in Supabase. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'Push not supported here.' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'Notifications not allowed.' }
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!) as BufferSource,
      })
    }
    const json = sub.toJSON()
    await supabase!.from('push_subscriptions').upsert(
      { endpoint: json.endpoint, sub: json },
      { onConflict: 'endpoint' },
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return !!(await reg.pushManager.getSubscription())
  } catch {
    return false
  }
}
