import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../lib/firebase'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Smartphone, ArrowLeft } from 'lucide-react'
import { ACCENT, ACCENT_SOFT, ACCENT_GLOW } from '../lib/accent'

const AUTH_TABS = [
  { id: 'signin', label: 'Sign in' },
  { id: 'signup', label: 'Create' },
  { id: 'phone', label: 'Phone' },
]

export default function AuthPage() {
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [otpSent, setOtpSent]   = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const confirmRef = useRef(null)
  const verifierRef = useRef(null)
  const [verifierReady, setVerifierReady] = useState(false)

  useEffect(() => {
    if (authMode !== 'phone') {
      setOtp('')
      setOtpSent(false)
      setVerifierReady(false)
      try { verifierRef.current?.clear() } catch {}
      verifierRef.current = null
      return
    }

    let cancelled = false
    async function setup() {
      try { verifierRef.current?.clear() } catch {}
      const v = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { console.log('reCAPTCHA solved') },
        'expired-callback': () => { console.log('reCAPTCHA expired') },
      })
      await v.render()
      if (!cancelled) {
        verifierRef.current = v
        setVerifierReady(true)
      }
    }
    setup().catch(err => {
      if (!cancelled) toast.error('reCAPTCHA setup failed: ' + (err.message || err))
    })
    return () => { cancelled = true }
  }, [authMode])

  async function sendOtp() {
    const cleaned = phone.replace(/\s+/g, '')
    if (!cleaned) { toast.error('Enter your phone number'); return }
    const full = countryCode + cleaned
    setPhoneLoading(true)
    try {
      const verifier = verifierRef.current
      if (!verifier || !verifierReady) { toast.error('reCAPTCHA not ready, please wait'); return }
      const confirmation = await signInWithPhoneNumber(auth, full, verifier)
      confirmRef.current = confirmation
      setOtpSent(true)
      toast.success('OTP sent!')
    } catch (err) {
      console.error('sendOtp error:', err)
      try { verifierRef.current?.reset() } catch {}
      const msg = (err.message || '')
        .replace('Firebase: ', '')
        .replace(/ \(auth\/.*\)\.?/, '')
      toast.error(msg || 'Something went wrong')
    } finally {
      setPhoneLoading(false)
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (loading) return
    if (!email.trim() || !password) return
    setLoading(true)
    try {
      if (authMode === 'signup') {
        if (!name.trim()) { toast.error('Enter your name'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(cred.user, { displayName: name.trim() })
        toast.success('Welcome to 4 ✦')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      const msg = (err.message || '')
        .replace('Firebase: ', '')
        .replace(/ \(auth\/.*\)\.?/, '')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) { toast.error('Enter the OTP'); return }
    setPhoneLoading(true)
    try {
      await confirmRef.current.confirm(otp.trim())
      // onAuthStateChanged in App.jsx handles profile creation
      toast.success('Signed in!')
    } catch (err) {
      const msg = (err.message || '')
        .replace('Firebase: ', '')
        .replace(/ \(auth\/.*\)\.?/, '')
      toast.error(msg || 'Invalid OTP')
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <div className="h-full bg-black flex flex-col items-center justify-center px-6 overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,69,58,0.06) 0%, transparent 70%)' }}
      />

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] glass-card rounded-3xl p-6"
      >
        <div className="flex glass-pill rounded-2xl p-1 mb-5">
          {AUTH_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAuthMode(tab.id)}
              className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 relative"
              style={{ color: authMode === tab.id ? '#fff' : 'rgba(255,255,255,0.35)' }}
            >
              {authMode === tab.id && (
                <motion.div
                  layoutId="auth-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {tab.id === 'phone' ? <Smartphone size={13} /> : tab.id === 'signin' ? null : null}
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {authMode === 'phone' ? (
          <div className="space-y-3">
            {!otpSent ? (
              <>
                <div className="flex gap-2">
                  <div className="flex-shrink-0">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="input-field w-[90px] text-center"
                      style={{ appearance: 'none' }}
                    >
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+91">+91</option>
                      <option value="+86">+86</option>
                      <option value="+81">+81</option>
                      <option value="+61">+61</option>
                      <option value="+49">+49</option>
                      <option value="+33">+33</option>
                    </select>
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input-field flex-1"
                    autoComplete="tel"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={phoneLoading}
                  onClick={sendOtp}
                  className="w-full py-3.5 rounded-2xl text-[15px] font-semibold disabled:opacity-50 transition-opacity"
                  style={{ background: ACCENT, boxShadow: ACCENT_GLOW }}
                >
                  {phoneLoading ? <span className="flex items-center justify-center gap-2"><Spinner /> Sending…</span> : 'Send OTP'}
                </motion.button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => { setOtpSent(false); setOtp('') }}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span className="text-[12px] text-white/40">OTP sent to {countryCode} {phone}</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-[20px] tracking-[8px] font-mono"
                  autoComplete="one-time-code"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={phoneLoading || otp.length < 4}
                  onClick={verifyOtp}
                  className="w-full py-3.5 rounded-2xl text-[15px] font-semibold disabled:opacity-50 transition-opacity"
                  style={{ background: ACCENT, boxShadow: ACCENT_GLOW }}
                >
                  {phoneLoading ? <span className="flex items-center justify-center gap-2"><Spinner /> Verifying…</span> : 'Verify & Sign in'}
                </motion.button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <AnimatePresence>
              {authMode === 'signup' && (
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
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
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
                  {authMode === 'signup' ? 'Creating…' : 'Signing in…'}
                </span>
              ) : (
                authMode === 'signup' ? 'Create account' : 'Sign in'
              )}
            </motion.button>
          </form>
        )}
      </motion.div>

      {/* reCAPTCHA container — invisible */}
      <div id="recaptcha-container" />

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
