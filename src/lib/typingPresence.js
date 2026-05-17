import { ref, set, remove, onValue, onDisconnect } from 'firebase/database'
import { rtdb } from './firebase'

let disconnectRegistered = new Set()

export function setTyping(conversationId, uid, isTyping) {
  const path = ref(rtdb, `typing/${conversationId}/${uid}`)
  if (isTyping) {
    set(path, true)
    const key = `${conversationId}/${uid}`
    if (!disconnectRegistered.has(key)) {
      disconnectRegistered.add(key)
      onDisconnect(path).remove()
    }
  } else {
    remove(path)
    const key = `${conversationId}/${uid}`
    disconnectRegistered.delete(key)
  }
}

export function subscribeTyping(conversationId, otherUid, callback) {
  const path = ref(rtdb, `typing/${conversationId}/${otherUid}`)
  return onValue(path, snap => {
    callback(snap.val() === true || snap.val() === 1)
  })
}
