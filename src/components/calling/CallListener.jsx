import { useEffect, useRef } from 'react'
import { onValue } from 'firebase/database'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { incomingCallsRef } from '../../lib/callSignaling'
import { useStore } from '../../lib/store'

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
  const setCallState = useStore(s => s.setCallState)
  const ringingRef = useRef(new Set())

  useEffect(() => {
    if (!user?.uid) return

    const callsRef = incomingCallsRef(user.uid)

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

      setCallState('incoming', {
        type: data.type || 'audio',
        remoteUser,
        conversationId,
      })
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
    }
  }, [user?.uid, setCallState])

  return null
}
