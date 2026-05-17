import {
  ref, set, update, push, remove, onValue, get, serverTimestamp,
} from 'firebase/database'
import { rtdb } from './firebase'

/** RTDB path for call signaling — lower latency than Firestore. */
export function callSignalRef(calleeId, conversationId) {
  return ref(rtdb, `callSignals/${calleeId}/${conversationId}`)
}

export function incomingCallsRef(calleeId) {
  return ref(rtdb, `callSignals/${calleeId}`)
}

export async function removeCallSignal(calleeId, conversationId) {
  await remove(callSignalRef(calleeId, conversationId))
}

export async function writeRingingCall({
  calleeId,
  conversationId,
  callerId,
  type,
  offer,
}) {
  const base = callSignalRef(calleeId, conversationId)
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

export async function writeCallAnswer(calleeId, conversationId, answer) {
  await update(callSignalRef(calleeId, conversationId), {
    answer: { sdp: answer.sdp, type: answer.type },
    status: 'active',
  })
}

export async function endCallSignal(calleeId, conversationId) {
  try {
    await update(callSignalRef(calleeId, conversationId), { status: 'ended' })
    await remove(callSignalRef(calleeId, conversationId))
  } catch { /* already removed */ }
}

export function pushIceCandidate(calleeId, conversationId, role, candidate) {
  const path = role === 'caller' ? 'offerCandidates' : 'answerCandidates'
  return push(ref(rtdb, `callSignals/${calleeId}/${conversationId}/${path}`), candidate.toJSON())
}

export function listenCallSignal(calleeId, conversationId, handler) {
  const r = callSignalRef(calleeId, conversationId)
  return onValue(r, snap => handler(snap.val()))
}

export function listenIceCandidates(calleeId, conversationId, remoteRole, handler) {
  const path = remoteRole === 'caller' ? 'offerCandidates' : 'answerCandidates'
  const r = ref(rtdb, `callSignals/${calleeId}/${conversationId}/${path}`)
  return onValue(r, snap => {
    snap.forEach(child => handler(child.val(), child.key))
  })
}

export async function readCallSignal(calleeId, conversationId) {
  const snap = await get(callSignalRef(calleeId, conversationId))
  return snap.val()
}
