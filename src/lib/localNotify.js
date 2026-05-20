/**
 * Show a local system notification for calls or messages when the app
 * is in the background. Uses the Web Notification API.
 */
export function showLocalNotification(title, options = {}) {
  if (typeof Notification === 'undefined') return null
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: '4-app',
        vibrate: [200, 100, 200],
        ...options,
      })
      return notif
    } catch (e) {
      console.warn('Local notification failed:', e)
    }
  }
  return null
}

export function isAppHidden() {
  return typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')
}

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}
