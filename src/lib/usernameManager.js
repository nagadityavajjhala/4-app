import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const USERNAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // 2 weeks

/** Usernames reserved for the creator. The creator (identified by email)
 *  can claim these whenever they want — no one else can take them. */
export const RESERVED_USERNAMES = {
  // creator emails -> the special username they get
  // Add your email here to claim a reserved name
}

/** Check if a username is reserved for a specific email */
export function isReservedFor(username, email) {
  const entry = Object.entries(RESERVED_USERNAMES).find(
    ([, name]) => name.toLowerCase() === username.toLowerCase()
  )
  if (!entry) return false
  // If this email owns the reservation, it's allowed
  return entry[0].toLowerCase() === email?.toLowerCase()
}

/** Check if a username is available */
export async function isUsernameAvailable(username, excludeUid) {
  const q = query(collection(db, 'users'), where('username', '==', username))
  const snap = await getDocs(q)
  return snap.docs.every(d => d.id === excludeUid)
}

/** Get remaining cooldown in days for changing username */
export function getCooldownDays(usernameChangedAt) {
  if (!usernameChangedAt) return 0
  const changed = usernameChangedAt?.toMillis?.() ?? usernameChangedAt
  const elapsed = Date.now() - changed
  const remaining = USERNAME_COOLDOWN_MS - elapsed
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
}

/** Change username for a user */
export async function changeUsername(uid, newUsername) {
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, {
    username: newUsername,
    usernameChangedAt: serverTimestamp(),
  })
}
