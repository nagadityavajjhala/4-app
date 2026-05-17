import { ref, set, remove, onValue, onDisconnect } from 'firebase/database'
import { rtdb } from './firebase'

export function setTyping(conversationId, uid, isTyping) {
  const path = ref(rtdb, `typing/${conversationId}/${uid}`)
  if (isTyping) {
    set(path, true)
    onDisconnect(path).remove()
  } else {
    remove(path)
  }
}

export function subscribeTyping(conversationId, otherUid, callback) {
  const path = ref(rtdb, `typing/${conversationId}/${otherUid}`)
  return onValue(path, snap => {
    callback(snap.val() === true)
  })
}
