import React, { useEffect, useState, useRef } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot as fsOnSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, onDisconnect, set, onValue, serverTimestamp as rtServerTimestamp } from 'firebase/database'
import toast, { Toaster } from 'react-hot-toast'
import { auth, db, rtdb } from './lib/firebase'
import { useStore } from './lib/store'
import { getOrCreateKeypair, getPublicKeyB64 } from './lib/crypto'
import { requestNotificationPermission, requestAndroidNotificationPermission, onForegroundMessage, cleanupMessaging } from './lib/notifications'
import { showLocalNotification, isAppHidden, ensureNotificationPermission } from './lib/localNotify'
import { App as CapacitorApp } from '@capacitor/app'
import AuthPage from './pages/AuthPage'
import MainApp from './pages/MainApp'
import LoadingScreen from './components/ui/LoadingScreen'

export default function App() {
  const [loading, setLoading] = useState(true)
  const user = useStore(s => s.user)
  const { setUser, setUserProfile, setOnlineUsers } = useStore()
  const permRequestedRef = useRef(false)
  const lastMsgSeenRef = useRef({})

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)

        // Ensure keypair exists
        getOrCreateKeypair()
        const publicKey = getPublicKeyB64()

        // Load or create user profile
        const profileRef = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(profileRef)

        if (snap.exists()) {
          const profile = snap.data()
          // Update public key if changed
          if (profile.publicKey !== publicKey) {
            await setDoc(profileRef, { publicKey, lastSeen: serverTimestamp() }, { merge: true })
          }
          setUserProfile({ ...profile, uid: firebaseUser.uid })
        } else {
          // New user — generate unique username
          const username = generateUsername()
          const profile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || username,
            username,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || null,
            publicKey,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            bio: '',
            avatarColor: randomColor(),
          }
          await setDoc(profileRef, profile)
          setUserProfile({ ...profile, uid: firebaseUser.uid })
        }

        // Set online presence in Realtime DB
        const presenceRef = ref(rtdb, `presence/${firebaseUser.uid}`)
        set(presenceRef, { online: true, lastSeen: rtServerTimestamp() })
        onDisconnect(presenceRef).set({ online: false, lastSeen: rtServerTimestamp() })

        // Push notification permission requires a user gesture (Chrome).
        // Request on first user click/tap after auth.
        if (!permRequestedRef.current) {
          const requestOnGesture = () => {
            if (permRequestedRef.current) return
            permRequestedRef.current = true
            requestNotificationPermission()
            requestAndroidNotificationPermission()
            document.removeEventListener('click', requestOnGesture)
            document.removeEventListener('touchstart', requestOnGesture)
          }
          document.addEventListener('click', requestOnGesture, { once: true })
          document.addEventListener('touchstart', requestOnGesture, { once: true })
        }

      } else {
        setUser(null)
        setUserProfile(null)
        cleanupMessaging()
      }
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    const presenceRef = ref(rtdb, 'presence')
    const unsub = onValue(presenceRef, snap => {
      setOnlineUsers(snap.val() || {})
    })
    return unsub
  }, [user, setOnlineUsers])

  // Foreground push notification handler (from FCM)
  useEffect(() => {
    onForegroundMessage(data => {
      const conversationId = data.conversationId
      const activeChatId = useStore.getState().activeChatId
      const senderName = data.senderName || 'Someone'
      const body = data.body || ''

      if (data.type === 'call') {
        toast(`${senderName} is calling`, {
          icon: '📞',
          duration: 8000,
          style: { background: '#1a1a1a', color: '#fff', borderRadius: '14px' },
        })
        return
      }

      if (conversationId && conversationId !== activeChatId) {
        toast(`${senderName}: ${body}`, {
          icon: '💬',
          duration: 4000,
          style: { background: '#1a1a1a', color: '#fff', borderRadius: '14px' },
        })
      }
    })
  }, [])

  // Local notification handler — detect new messages via conversation snapshot
  // This works even without FCM push because Firestore onSnapshot is active.
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid)
    )
    const unsub = fsOnSnapshot(q, async snap => {
      snap.docChanges().forEach(change => {
        if (change.type !== 'modified') return
        const data = change.doc.data()
        const lm = data.lastMessage
        if (!lm || lm.senderId === user.uid) return
        const otherUid = data.members?.find(m => m !== user.uid)
        if (!otherUid) return

        const convId = change.doc.id
        // Avoid duplicate notifications (debounce same message)
        const key = `${convId}-${lm.text}-${lm.senderId}`
        if (lastMsgSeenRef.current[key]) return
        lastMsgSeenRef.current[key] = true
        setTimeout(() => { delete lastMsgSeenRef.current[key] }, 5000)

        // Show toast for foreground, local notification for background
        const state = useStore.getState()
        if (convId === state.activeChatId) return

        // Look up sender name from cache or Firestore
        const displayName = lm.senderName || 'Someone'

        if (isAppHidden()) {
          ensureNotificationPermission().then(granted => {
            if (granted) {
              showLocalNotification(displayName, {
                body: lm.text || (lm.type === 'image' ? '📷 Photo' : lm.type === 'audio' ? '🎤 Voice message' : lm.type === 'game' ? '🎮 Game' : 'New message'),
                tag: `msg-${convId}`,
                data: { conversationId: convId },
              })
            }
          })
        } else {
          toast(`${displayName}: ${lastMessagePreview(lm)}`, {
            icon: '💬',
            duration: 4000,
            style: { background: '#1a1a1a', color: '#fff', borderRadius: '14px' },
          })
        }
      })
    })
    return unsub
  }, [user])

  function lastMessagePreview(msg) {
    if (!msg) return ''
    if (msg.type === 'image') return '📷 Photo'
    if (msg.type === 'audio') return '🎤 Voice message'
    if (msg.type === 'game') {
      if (msg.gameType === 'wordle') return '🎮 Wordle'
      if (msg.gameType === 'trivia') return '🎮 Trivia'
      return '🎮 Game'
    }
    return (msg.text || '').slice(0, 60)
  }

  // Handle back/gesture navigation — single back = navigate, double back root = exit
  useEffect(() => {
    let lastBackRoot = 0
    let removeFn

    const handleBack = () => {
      const s = useStore.getState()
      if (s.callState) {
        s.setCallState(null)
      } else if (s.activeChatId) {
        s.clearActiveChat()
      } else if (s.activeTab !== 'chats') {
        s.setActiveTab('chats')
      } else {
        // On root screen — double press within 2s to exit
        const now = Date.now()
        if (now - lastBackRoot < 2000) {
          try { CapacitorApp.exitApp() } catch {}
        } else {
          lastBackRoot = now
          toast('Press back again to exit', {
            className: 'text-white/50 text-[12px]',
            style: { background: '#1a1a1a' },
          })
        }
      }
    }

    // Web: intercept browser back gesture
    window.history.pushState(null, '')
    window.addEventListener('popstate', (e) => {
      e.preventDefault()
      window.history.pushState(null, '')
      handleBack()
    })

    // Capacitor Android: back button / gesture
    try {
      CapacitorApp.addListener('backButton', handleBack).then(h => { removeFn = h.remove })
    } catch {}

    return () => {
      if (removeFn) removeFn()
    }
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthGate><AuthPage /></AuthGate>} />
        <Route path="/*" element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#30d158', secondary: '#000' } },
          error: { iconTheme: { primary: '#ff453a', secondary: '#000' } },
        }}
      />
    </Router>
  )
}

function ProtectedRoute({ children }) {
  const user = useStore(s => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AuthGate({ children }) {
  const user = useStore(s => s.user)
  if (user) return <Navigate to="/" replace />
  return children
}

function generateUsername() {
  const adjectives = ['swift', 'calm', 'warm', 'bright', 'soft', 'still', 'clear', 'deep', 'quiet', 'pure']
  const nouns = ['moon', 'star', 'wave', 'leaf', 'river', 'cloud', 'stone', 'light', 'dawn', 'wind']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}.${noun}.${num}`
}

function randomColor() {
  const colors = ['#ff453a', '#30d158', '#ff9f0a', '#bf5af2', '#ff375f', '#5ac8fa', '#ff6961']
  return colors[Math.floor(Math.random() * colors.length)]
}
