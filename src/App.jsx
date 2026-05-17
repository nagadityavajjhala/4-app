import React, { useEffect, useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, onDisconnect, set, onValue, serverTimestamp as rtServerTimestamp } from 'firebase/database'
import { Toaster } from 'react-hot-toast'
import { auth, db, rtdb } from './lib/firebase'
import { useStore } from './lib/store'
import { getOrCreateKeypair, getPublicKeyB64 } from './lib/crypto'
import AuthPage from './pages/AuthPage'
import MainApp from './pages/MainApp'
import LoadingScreen from './components/ui/LoadingScreen'

export default function App() {
  const [loading, setLoading] = useState(true)
  const user = useStore(s => s.user)
  const { setUser, setUserProfile, setOnlineUsers } = useStore()

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

      } else {
        setUser(null)
        setUserProfile(null)
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
