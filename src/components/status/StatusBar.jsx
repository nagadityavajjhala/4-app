import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, where, onSnapshot,
  addDoc, serverTimestamp, Timestamp, deleteDoc, doc,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useStore } from '../../lib/store'
import Avatar from '../ui/Avatar'
import { Plus, X, Image as ImageIcon, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ACCENT } from '../../lib/accent'

// ─────────────────────────────────────────────────────────────
export default function StatusBar() {
  const { user, userProfile } = useStore()
  const [statuses, setStatuses]       = useState([])
  const [showCreate, setShowCreate]   = useState(false)
  const [viewingGroup, setViewingGroup] = useState(null)

  useEffect(() => {
    if (!user) return
    // NOTE: fetch without orderBy to avoid composite index requirement.
    // We filter and sort client-side.
    const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)
    const q = query(
      collection(db, 'statuses'),
      where('createdAt', '>', cutoff)
    )
    const unsub = onSnapshot(q, snap => {
      // Group by uid
      const grouped = {}
      snap.docs.forEach(d => {
        const s = { id: d.id, ...d.data() }
        if (!grouped[s.uid]) {
          grouped[s.uid] = { uid: s.uid, user: s.user, items: [] }
        }
        grouped[s.uid].items.push(s)
      })
      // Sort each group's items chronologically
      Object.values(grouped).forEach(g => {
        g.items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0
          const tb = b.createdAt?.toMillis?.() ?? 0
          return ta - tb
        })
      })
      setStatuses(Object.values(grouped))
    }, err => {
      // If index error, just silently fail — statuses are non-critical
      console.warn('Status query error:', err.message)
    })
    return unsub
  }, [user])

  return (
    <>
      <div className="px-4 pb-3">
        <div
          className="flex gap-3 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* My status button */}
          <StatusRing
            label="My Status"
            onPress={() => setShowCreate(true)}
            isAdd
          />

          {/* Others */}
          {statuses.map(group => (
            <StatusRing
              key={group.uid}
              label={group.user?.displayName?.split(' ')[0] || ''}
              user={group.user}
              onPress={() => setViewingGroup(group)}
            />
          ))}
        </div>
      </div>

      {/* Thin divider */}
      <div className="mx-4 mb-2" style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

      <AnimatePresence>
        {showCreate && (
          <CreateStatusModal
            user={userProfile}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingGroup && (
          <StatusViewer
            group={viewingGroup}
            onClose={() => setViewingGroup(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Ring button ──────────────────────────────────────────────
function StatusRing({ label, user, onPress, isAdd }) {
  return (
    <button
      onClick={onPress}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className="relative">
        {isAdd ? (
          <div
            className="w-[58px] h-[58px] rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1.5px dashed rgba(255,255,255,0.2)',
            }}
          >
            <Plus size={20} strokeWidth={1.8} className="text-white/40" />
          </div>
        ) : (
          <div
            className="w-[58px] h-[58px] rounded-full p-[2px]"
            style={{ background: 'linear-gradient(135deg, #ff453a 0%, #30d158 50%, #ff9f0a 100%)' }}
          >
            <div className="w-full h-full rounded-full bg-black p-[2px]">
              <Avatar user={user} size={50} />
            </div>
          </div>
        )}
      </div>
      <span className="text-[10px] text-white/45 max-w-[58px] truncate">{label}</span>
    </button>
  )
}

// ── Create status modal ──────────────────────────────────────
function CreateStatusModal({ user, onClose }) {
  const { user: authUser } = useStore()
  const [text, setText]     = useState('')
  const [image, setImage]   = useState(null) // base64
  const [posting, setPosting] = useState(false)
  const fileRef = useRef(null)

  function pickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      setImage(canvas.toDataURL('image/jpeg', 0.78))
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  async function post() {
    if (!text.trim() && !image) {
      toast.error('Add some text or an image')
      return
    }
    setPosting(true)
    try {
      await addDoc(collection(db, 'statuses'), {
        uid: authUser.uid,
        user: {
          displayName: user?.displayName || '',
          username:    user?.username    || '',
          avatarColor: user?.avatarColor || '#ff453a',
          photoURL:    user?.photoURL    || null,
        },
        text:      text.trim(),
        image:     image || null,
        createdAt: serverTimestamp(),
      })
      toast.success('Status posted')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Could not post — check Firestore rules')
    } finally {
      setPosting(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="New Status">
      <div className="px-5 pb-2 space-y-3">
        {/* Image preview */}
        {image && (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={image} alt="preview" className="w-full max-h-52 object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Text input */}
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={300}
          rows={3}
          className="input-field resize-none text-[15px]"
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-white/50 transition-colors active:text-white"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <ImageIcon size={15} strokeWidth={1.8} />
            Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/25">{300 - text.length}</span>
            <button
              onClick={post}
              disabled={posting || (!text.trim() && !image)}
              className="px-5 py-2.5 rounded-xl text-[14px] font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: '#ff453a' }}
            >
              {posting ? <Spinner /> : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

// ── Status viewer ────────────────────────────────────────────
function StatusViewer({ group, onClose }) {
  const { user } = useStore()
  const [idx, setIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const current = group.items[idx]
  const total   = group.items.length
  const isOwn = group.uid === user?.uid

  useEffect(() => {
    const duration = current?.image ? 6000 : 4000
    const t = setTimeout(() => {
      if (idx < total - 1) setIdx(i => i + 1)
      else onClose()
    }, duration)
    return () => clearTimeout(t)
  }, [idx, current])

  function prev(e) { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)) }
  function next(e) { e.stopPropagation(); if (idx < total - 1) setIdx(i => i + 1); else onClose() }

  const duration = current?.image ? 6 : 4

  async function deleteCurrent() {
    if (!current?.id || deleting) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'statuses', current.id))
      toast.success('Status deleted')
      if (total <= 1) onClose()
      else if (idx >= total - 1) setIdx(i => Math.max(0, i - 1))
    } catch {
      toast.error('Could not delete status')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Progress bars */}
      <div className="flex gap-1 px-4 pt-safe pt-3">
        {group.items.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: i < idx ? '100%' : '0%' }}
              animate={{ width: i === idx ? '100%' : i < idx ? '100%' : '0%' }}
              transition={{ duration: i === idx ? duration : 0, ease: 'linear' }}
            />
          </div>
        ))}
      </div>

      {/* User header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <Avatar user={group.user} size={36} />
        <div>
          <p className="font-semibold text-[14px]">{group.user?.displayName}</p>
          <p className="text-[11px] text-white/40">
            {current?.createdAt?.toDate ? relativeTime(current.createdAt.toDate()) : ''}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isOwn && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); deleteCurrent() }}
              disabled={deleting}
              className="p-1.5 rounded-full text-white/50 active:text-red-400 disabled:opacity-40"
              style={{ background: 'rgba(255,69,58,0.15)' }}
              aria-label="Delete status"
            >
              <Trash2 size={18} strokeWidth={1.8} />
            </button>
          )}
          <button type="button" onClick={onClose} className="p-1 text-white/50 active:text-white">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        {current?.image && (
          <img
            src={current.image}
            alt=""
            className="w-full max-h-72 object-cover rounded-3xl"
          />
        )}
        {current?.text && (
          <p className="text-[22px] font-medium text-center leading-snug">
            {current.text}
          </p>
        )}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex">
        <div className="flex-1" onClick={prev} />
        <div className="flex-1" onClick={next} />
      </div>
    </motion.div>
  )
}

// ── Bottom sheet primitive ───────────────────────────────────
function BottomSheet({ children, onClose, title }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="rounded-t-[28px] overflow-hidden"
        style={{
          background: 'rgba(20,20,22,0.97)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-semibold text-[17px]">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <X size={14} strokeWidth={2.5} className="text-white/70" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function relativeTime(date) {
  const diff = Date.now() - date.getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
