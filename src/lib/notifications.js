import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore'
import { auth, db } from './firebase'

let messaging = null
let unsubMessage = null

export function initMessaging() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  try {
    messaging = getMessaging()
  } catch(e) {
    console.warn('FCM init:', e.message)
  }
}

export async function requestNotificationPermission() {
  try {
    // Always request Notification permission regardless of FCM availability
    if (typeof Notification === 'undefined') return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // Try to get FCM token if messaging is available
    if (messaging) {
      try {
        const token = await getToken(messaging, {
          vapidKey: 'BFBoAh3sqcRmdBcACy6XvJLoYmMNK5AMY6ne84L1RQqE84RPSTghqCbZqE34YCF6LBfnOOs7RxxATQ-NglhqY8c',
        })
        if (token && auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'fcmTokens', token), {
            token,
            platform: /android|iphone|ipad/i.test(navigator.userAgent) ? 'android' : 'web',
            createdAt: new Date().toISOString(),
          })
        }
        return token
      } catch (e) {
        console.warn('FCM token error:', e.message)
      }
    }
    return 'granted' // Notification permission granted even if FCM token failed
  } catch (e) {
    console.warn('Notification permission error:', e.message)
    return null
  }
}

export async function removeFcmToken(token) {
  if (!token || !auth.currentUser) return
  try {
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'fcmTokens', token))
  } catch {}
}

export function onForegroundMessage(handler) {
  if (!messaging) return
  if (unsubMessage) unsubMessage()
  unsubMessage = onMessage(messaging, payload => {
    const data = payload.data || {}
    handler(data)
  })
}

export function cleanupMessaging() {
  if (unsubMessage) unsubMessage()
}

/**
 * Request native notification permission on Android via Capacitor plugin.
 * Call this after auth on Capacitor builds.
 */
export async function requestAndroidNotificationPermission() {
  try {
    const isNative = window.Capacitor?.isNative
    if (!isNative) return false
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging')
    const result = await FirebaseMessaging.requestPermissions()
    const granted = result.receive === 'granted'
    if (granted) {
      const { getToken: getFcmToken } = await import('firebase/messaging')
      if (messaging && auth.currentUser) {
        const token = await getFcmToken(messaging, {
          vapidKey: 'BFBoAh3sqcRmdBcACy6XvJLoYmMNK5AMY6ne84L1RQqE84RPSTghqCbZqE34YCF6LBfnOOs7RxxATQ-NglhqY8c',
        })
        if (token) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'fcmTokens', token), {
            token,
            platform: 'android',
            createdAt: new Date().toISOString(),
          })
        }
      }
    }
    return granted
  } catch {
    return false
  }
}
