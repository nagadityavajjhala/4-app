import { useEffect, useRef } from 'react'
import { onValue } from 'firebase/database'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { allIncomingCallsRef } from '../../lib/callSignaling'
import { useStore } from '../../lib/store'
import { startRinging, stopRinging } from '../../lib/ringtone'
import { showLocalNotification, isAppHidden, ensureNotificationPermission } from '../../lib/localNotify'

const profileCache = new Map()

async function getCallerProfile(uid) {
  if (profileCache.has(uid)) return profileCache.get(uid)
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const profile = { uid, ...snap.data() }
  profileCache.set(uid, profile)
  return profile
}

/** Watches RTDB for ringing calls (onValue catches existing + new calls). */
export default function CallListener() {
  const user = useStore(s => s.user)
  const callState = useStore(s => s.callState)
  const setCallState = useStore(s => s.setCallState)
  const ringingRef = useRef(new Set())

  // Stop ringing when call state leaves 'incoming'
  useEffect(() => {
    if (callState !== 'incoming') {
      stopRinging()
    }
  }, [callState])

  useEffect(() => {
    if (!user?.uid) return

    const callsRef = allIncomingCallsRef()

    async function considerCall(conversationId, data) {
      if (!data || data.status !== 'ringing' || data.calleeId !== user.uid) return
      if (useStore.getState().callState) return
      if (ringingRef.current.has(conversationId)) return

      ringingRef.current.add(conversationId)
      const remoteUser = await getCallerProfile(data.callerId)
      if (!remoteUser) {
        ringingRef.current.delete(conversationId)
        return
      }

      // Show system notification if app is in background
      if (isAppHidden()) {
        await ensureNotificationPermission()
        showLocalNotification(`📞 ${remoteUser.displayName || 'Someone'} is calling`, {
          body: `${data.type || 'Audio'} call`,
          tag: `call-${conversationId}`,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
        })
      }

      setCallState('incoming', {
        type: data.type || 'audio',
        remoteUser,
        conversationId,
      })
      startRinging()
    }

    const unsub = onValue(callsRef, snap => {
      const activeRinging = new Set()
      snap.forEach(child => {
        const data = child.val()
        if (data?.status === 'ringing' && data.calleeId === user.uid) {
          activeRinging.add(child.key)
          considerCall(child.key, data)
        }
      })
      // Allow same conversation to ring again after it leaves the snapshot
      ringingRef.current.forEach(id => {
        if (!activeRinging.has(id)) ringingRef.current.delete(id)
      })
    })

    return () => {
      unsub()
      ringingRef.current.clear()
      stopRinging()
    }
  }, [user?.uid, setCallState])

  return null
}
