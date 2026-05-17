import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '../lib/firebase'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { ACCENT, ACCENT_SOFT, ACCENT_GLOW } from '../lib/accent'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { toast.error('Enter your name'); return }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(cred.user, { displayName: name.trim() })
        toast.success('Welcome to 4 ✦')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      const msg = err.message
        .replace('Firebase: ', '')
        .replace(/ \(auth\/.*\)\.?/, '')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full bg-black flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,69,58,0.06) 0%, transparent 70%)' }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 text-center"
      >
        <div
          className="text-white font-bold mb-2 select-none tracking-tight"
          style={{ fontSize: 72, lineHeight: 1, letterSpacing: '-4px' }}
        >
          4
        </div>
        <p className="text-white/20 text-[12px] tracking-[0.2em] uppercase font-light">
          private · encrypted
        </p>
      </motion.div>

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] glass-card rounded-3xl p-6"
      >
        {/* Mode toggle */}
        <div className="flex glass-pill rounded-2xl p-1 mb-5">
          {['signin', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 relative"
              style={{ color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)' }}
            >
              {mode === m && (
                <motion.div
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative z-10">
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
            autoComplete="email"
          />

          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input-field pr-11"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 active:text-white/50 transition-colors"
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold mt-1 transition-opacity disabled:opacity-50"
            style={{ background: ACCENT, boxShadow: ACCENT_GLOW }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                {mode === 'signup' ? 'Creating…' : 'Signing in…'}
              </span>
            ) : (
              mode === 'signup' ? 'Create account' : 'Sign in'
            )}
          </motion.button>
        </form>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-10 text-white/12 text-[11px] text-center tracking-wide"
      >
        End-to-end encrypted · Just for us
      </motion.p>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
