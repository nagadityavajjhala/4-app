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
  if (!messaging) return null
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

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
    console.warn('FCM setup:', e.message)
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
