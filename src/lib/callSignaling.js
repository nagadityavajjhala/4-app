import {
  ref, set, update, push, remove, onValue, get, serverTimestamp,
} from 'firebase/database'
import { rtdb } from './firebase'

/** RTDB path for call signaling — lower latency than Firestore. */
export function callSignalRef(conversationId) {
  return ref(rtdb, `callSignals/${conversationId}`)
}

export function allIncomingCallsRef() {
  return ref(rtdb, 'callSignals')
}

export async function removeCallSignal(conversationId) {
  await remove(callSignalRef(conversationId))
}

export async function writeRingingCall({
  calleeId,
  conversationId,
  callerId,
  type,
  offer,
}) {
  const base = callSignalRef(conversationId)
  try {
    await set(base, {
      callerId,
      calleeId,
      conversationId,
      type: type || 'audio',
      status: 'ringing',
      offer: { sdp: offer.sdp, type: offer.type },
      answer: null,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    const msg = String(err?.message || err?.code || '')
    if (err?.code === 'PERMISSION_DENIED' || msg.toLowerCase().includes('denied')) {
      throw new Error('Call failed: RTDB permission denied. Open Firebase Console → Realtime Database → Rules tab, paste:\n{ "rules": { ".read": "auth != null", ".write": "auth != null" } }')
    }
    throw err
  }
}

export async function writeCallAnswer(conversationId, answer) {
  await update(callSignalRef(conversationId), {
    answer: { sdp: answer.sdp, type: answer.type },
    status: 'active',
  })
}

export async function endCallSignal(conversationId) {
  try {
    await update(callSignalRef(conversationId), { status: 'ended' })
    await remove(callSignalRef(conversationId))
  } catch { /* already removed */ }
}

export function pushIceCandidate(conversationId, role, candidate) {
  const path = role === 'caller' ? 'offerCandidates' : 'answerCandidates'
  return push(ref(rtdb, `callSignals/${conversationId}/${path}`), candidate.toJSON())
}

export function listenCallSignal(conversationId, handler) {
  const r = callSignalRef(conversationId)
  return onValue(r, snap => handler(snap.val()))
}

export function listenIceCandidates(conversationId, remoteRole, handler) {
  const path = remoteRole === 'caller' ? 'offerCandidates' : 'answerCandidates'
  const r = ref(rtdb, `callSignals/${conversationId}/${path}`)
  return onValue(r, snap => {
    snap.forEach(child => handler(child.val(), child.key))
  })
}

export async function readCallSignal(conversationId) {
  const snap = await get(callSignalRef(conversationId))
  return snap.val()
}
