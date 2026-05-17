import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, orderBy, onSnapshot,
  serverTimestamp, doc, getDoc, setDoc, getDocs, where, limit,
  writeBatch, updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore } from '../lib/store'
import Avatar from '../components/ui/Avatar'
import StatusBar from '../components/status/StatusBar'
import {
  Search, ChevronLeft, Send, Phone, Video,
  UserPlus, Lock, X, Check, CheckCheck, Camera, ImagePlus, Mic, Play, Pause,
  Gamepad2, Palette,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'
import {
  prepareImageForFirestore, prepareAudioForFirestore, getAudioMimeType,
} from '../lib/chatMedia'
import AppLogo from '../components/ui/AppLogo'
import { ACCENT, ACCENT_SOFT, ACCENT_RGB } from '../lib/accent'
import { setTyping, subscribeTyping } from '../lib/typingPresence'
import { getChatTheme, setChatTheme, CHAT_THEMES } from '../lib/chatThemes'
import DailyPromptBanner from '../components/chat/DailyPromptBanner'
import ChatThemePicker from '../components/chat/ChatThemePicker'
import GamesSheet from '../components/games/GamesSheet'
import { WordleGameMessage, TriviaGameMessage } from '../components/games/GameMessage'
import { scoreGuess } from '../lib/wordleWords'
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function lastMessagePreview(msg) {
  if (!msg) return 'Tap to say hello'
  if (msg.type === 'image') return '📷 Photo'
  if (msg.type === 'audio') return '🎤 Voice message'
  if (msg.type === 'game') {
    if (msg.gameType === 'wordle') return '🎮 Wordle'
    if (msg.gameType === 'trivia') return '🎮 Trivia'
    return '🎮 Game'
  }
  return msg.text || 'Tap to say hello'
}

// ─────────────────────────────────────────────────────────────
// Root — switches between list and chat view
// ─────────────────────────────────────────────────────────────
export default function ChatsPage() {
  const { activeChatId } = useStore()
  return activeChatId ? <ChatView /> : <ChatList />
}

// ─────────────────────────────────────────────────────────────
// Chat List
// ─────────────────────────────────────────────────────────────
function ChatList() {
  const { user, onlineUsers, setActiveChat } = useStore()
  const [convos, setConvos]         = useState([])
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [promptToShare, setPromptToShare] = useState(null)
  const userCacheRef = useRef(new Map())

  // Load conversations — no orderBy so no composite index needed
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid)
    )
    const unsub = onSnapshot(q, async snap => {
      const list = []
      for (const d of snap.docs) {
        const data = d.data()
        const otherUid = data.members.find(m => m !== user.uid)
        if (!otherUid) continue
        let otherUser = userCacheRef.current.get(otherUid)
        if (!otherUser) {
          const otherSnap = await getDoc(doc(db, 'users', otherUid))
          if (!otherSnap.exists()) continue
          otherUser = { uid: otherUid, ...otherSnap.data() }
          userCacheRef.current.set(otherUid, otherUser)
        }
        list.push({ id: d.id, ...data, otherUser })
      }
      // Sort client-side by updatedAt descending
      list.sort((a, b) => {
        const ta = a.updatedAt?.toMillis?.() ?? 0
        const tb = b.updatedAt?.toMillis?.() ?? 0
        return tb - ta
      })
      setConvos(list)
      setLoading(false)
    })
    return unsub
  }, [user])

  const filtered = convos.filter(c => {
    const q = search.toLowerCase()
    return (
      c.otherUser?.displayName?.toLowerCase().includes(q) ||
      c.otherUser?.username?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="h-full flex flex-col bg-black">
      {/* ── Header ── */}
      <div style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
        className="px-5 pb-3">
        <div className="flex items-center justify-between mb-4 relative">
          <div className="w-[76px] flex justify-start">
            <Btn icon={<UserPlus size={18} strokeWidth={1.8} />} onClick={() => setShowAdd(true)} />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2">
            <AppLogo size={32} />
          </div>
          <div className="w-[76px] flex justify-end">
            <AvatarBtn onClick={() => setShowProfile(true)} />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-[14px] py-2.5"
          />
        </div>
      </div>

      {/* ── Status bar ── */}
      <StatusBar />

      <DailyPromptBanner onUse={text => setPromptToShare(text)} />

      {/* ── Conversation list ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState hasSearch={search.length > 0} onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="px-4 pb-4">
            {filtered.map(c => (
              <ConvoRow
                key={c.id}
                convo={c}
                online={onlineUsers[c.otherUser?.uid]?.online}
                onPress={() => setActiveChat(c.id, c.otherUser)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAdd && <AddContactModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        {promptToShare && (
          <PromptShareSheet
            prompt={promptToShare}
            convos={convos}
            onClose={() => setPromptToShare(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Btn({ icon, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white/70"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      {icon}
    </motion.button>
  )
}

function AvatarBtn({ onClick }) {
  const { userProfile } = useStore()
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick}>
      <Avatar user={userProfile} size={34} />
    </motion.button>
  )
}

function ConvoRow({ convo, online, onPress }) {
  const other = convo.otherUser
  const ts    = convo.updatedAt?.toDate?.()

  function fmtTime(d) {
    if (!d) return ''
    if (isToday(d))     return format(d, 'HH:mm')
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'dd/MM/yy')
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="w-full flex items-center gap-3 py-3 px-3 rounded-2xl text-left transition-colors active:bg-white/[0.04]"
    >
      <Avatar user={other} size={52} showOnline online={online} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-semibold text-[15px] truncate">{other?.displayName}</span>
          <span className="text-[11px] text-white/30 flex-shrink-0">{fmtTime(ts)}</span>
        </div>
        <p className="text-[13px] text-white/35 truncate mt-0.5">
          {lastMessagePreview(convo.lastMessage)}
        </p>
      </div>
    </motion.button>
  )
}

function SkeletonList() {
  return (
    <div className="px-4 pt-2 space-y-1">
      {[52, 40, 60].map((w, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="w-13 h-13 rounded-full skeleton flex-shrink-0" style={{ width: 52, height: 52 }} />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 skeleton rounded-full" style={{ width: `${w}%` }} />
            <div className="h-3 skeleton rounded-full w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasSearch, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-52 gap-3 px-8 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        <Lock size={22} strokeWidth={1.5} className="text-white/25" />
      </div>
      <p className="text-white/40 text-[14px]">
        {hasSearch ? 'No results' : 'No conversations yet'}
      </p>
      {!hasSearch && (
        <button
          onClick={onAdd}
          className="text-[13px] font-medium mt-1 px-5 py-2 rounded-full"
          style={{ background: ACCENT_SOFT, color: ACCENT }}
        >
          Add someone
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Add Contact Modal — search by username
// ─────────────────────────────────────────────────────────────
function AddContactModal({ onClose }) {
  const { user, setActiveChat } = useStore()
  const [query_, setQuery]    = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding]   = useState(null) // uid being added
  const debounce = useRef(null)

  async function searchUsers(q) {
    const term = q.trim().toLowerCase().replace(/^@/, '')
    if (term.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      // Try username prefix search first (needs Firestore index on 'username' field)
      // Falls back to fetching all users and filtering client-side if index missing
      let found = []
      try {
        const snap = await getDocs(
          query(
            collection(db, 'users'),
            where('username', '>=', term),
            where('username', '<=', term + '\uf8ff'),
            limit(20)
          )
        )
        found = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
      } catch (indexErr) {
        console.warn('Username index missing, falling back to full scan:', indexErr.message)
        // Fallback: get all users (fine for a small private app with <50 members)
        const snap = await getDocs(collection(db, 'users'))
        found = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u =>
            u.username?.toLowerCase().includes(term) ||
            u.displayName?.toLowerCase().includes(term)
          )
      }
      setResults(found.filter(u => u.uid !== user.uid).slice(0, 10))
    } catch (err) {
      console.error('searchUsers error:', err?.code, err?.message)
      if (err?.code === 'permission-denied') {
        toast.error('Permission denied — make sure Firestore rules are published.')
      }
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function onInput(e) {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => searchUsers(v), 300)
  }

  async function startChat(other) {
    setAdding(other.uid)
    try {
      const convoId  = [user.uid, other.uid].sort().join('_')
      const convoRef = doc(db, 'conversations', convoId)
      const snap     = await getDoc(convoRef)
      if (!snap.exists()) {
        await setDoc(convoRef, {
          members:     [user.uid, other.uid],
          createdAt:   serverTimestamp(),
          updatedAt:   serverTimestamp(),
          lastMessage: null,
        })
      }
      setActiveChat(convoId, other)
      onClose()
    } catch (err) {
      console.error('startChat error:', err?.code, err?.message)
      if (err?.code === 'permission-denied') {
        toast.error('Permission denied — paste the Firestore rules from firestore.rules into Firebase Console → Firestore → Rules and publish them.')
      } else {
        toast.error(`Could not start chat: ${err?.message || err}`)
      }
    } finally {
      setAdding(null)
    }
  }

  return (
    <Sheet onClose={onClose} title="New Message">
      <div className="px-5 pb-4">
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            autoFocus
            placeholder="Search by username…"
            value={query_}
            onChange={onInput}
            className="input-field pl-9 text-[14px]"
          />
        </div>

        {searching && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {!searching && results.length === 0 && query_.trim().length >= 2 && (
          <p className="text-center text-white/30 text-[13px] py-6">No users found</p>
        )}

        {!searching && query_.trim().length < 2 && (
          <p className="text-center text-white/20 text-[12px] py-4">
            Type at least 2 characters to search
          </p>
        )}

        <div className="space-y-1">
          {results.map(u => (
            <motion.button
              key={u.uid}
              whileTap={{ scale: 0.98 }}
              onClick={() => startChat(u)}
              disabled={adding === u.uid}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors active:bg-white/[0.05] disabled:opacity-60"
            >
              <Avatar user={u} size={46} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] truncate">{u.displayName}</p>
                <p className="text-[12px] text-white/40 truncate">@{u.username}</p>
              </div>
              {adding === u.uid
                ? <Spinner />
                : <Check size={16} className="text-white/20" />
              }
            </motion.button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────
// Profile Modal — edit name + pick photo
// ─────────────────────────────────────────────────────────────
function ProfileModal({ onClose }) {
  const { user, userProfile, setUserProfile } = useStore()
  const [name, setName]   = useState(userProfile?.displayName || '')
  const [photo, setPhoto] = useState(userProfile?.photoURL || null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Compress to max 200px, store as base64 (no Firebase Storage needed)
    const img   = new Image()
    const url   = URL.createObjectURL(file)
    img.onload  = () => {
      const MAX  = 200
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const b64 = canvas.toDataURL('image/jpeg', 0.82)
      setPhoto(b64)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  async function save() {
    if (!name.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      const profileRef = doc(db, 'users', user.uid)
      const updates    = { displayName: name.trim(), photoURL: photo }
      await setDoc(profileRef, updates, { merge: true })
      setUserProfile({ ...userProfile, ...updates })
      toast.success('Profile updated')
      onClose()
    } catch {
      toast.error('Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet onClose={onClose} title="Profile">
      <div className="px-5 pb-6 flex flex-col items-center gap-5">
        {/* Photo picker */}
        <div className="relative">
          <Avatar user={{ ...userProfile, photoURL: photo }} size={88} />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: ACCENT }}
          >
            <Camera size={14} strokeWidth={2} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
        </div>

        {/* Username badge */}
        <div className="px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <span className="text-[12px] text-white/50 font-mono">@{userProfile?.username}</span>
        </div>

        {/* Name */}
        <div className="w-full">
          <label className="text-[11px] text-white/35 uppercase tracking-wider mb-1.5 block pl-1">
            Display name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
            placeholder="Your name"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-[15px] font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: ACCENT }}
        >
          {saving ? <span className="flex justify-center"><Spinner /></span> : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────
// Chat View
// ─────────────────────────────────────────────────────────────
function ChatView() {
  const { activeChatId, activeChatUser, clearActiveChat, user, userProfile, setCallState } = useStore()
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const pendingRef = useRef([])
  const photoInputRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const recordSecondsRef = useRef(0)
  const [reactionTarget, setReactionTarget] = useState(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherReadAt, setOtherReadAt] = useState(null)
  const [themeId, setThemeId] = useState(() => getChatTheme(activeChatId).id)
  const [showGames, setShowGames] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const typingTimeoutRef = useRef(null)

  const theme = CHAT_THEMES[themeId] || CHAT_THEMES.classic

  useEffect(() => {
    setThemeId(getChatTheme(activeChatId).id)
  }, [activeChatId])

  useEffect(() => {
    if (!activeChatId || !activeChatUser?.uid) return
    const unsub = subscribeTyping(activeChatId, activeChatUser.uid, setOtherTyping)
    return () => unsub()
  }, [activeChatId, activeChatUser?.uid])

  useEffect(() => {
    if (!activeChatId || !user) return
    const convoRef = doc(db, 'conversations', activeChatId)
    const unsub = onSnapshot(convoRef, snap => {
      const data = snap.data()
      const otherRead = data?.readAt?.[activeChatUser?.uid]
      setOtherReadAt(otherRead?.toMillis?.() ?? null)
    })
    setDoc(convoRef, { [`readAt.${user.uid}`]: serverTimestamp() }, { merge: true }).catch(() => {})
    return unsub
  }, [activeChatId, activeChatUser?.uid, user])

  useEffect(() => {
    return () => {
      if (activeChatId && user) setTyping(activeChatId, user.uid, false)
    }
  }, [activeChatId, user])

  useEffect(() => {
    if (!activeChatId) return
    const q = query(
      collection(db, 'conversations', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      const serverMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const serverClientIds = new Set(serverMsgs.map(m => m.clientId).filter(Boolean))
      pendingRef.current = pendingRef.current.filter(p => !serverClientIds.has(p.clientId))
      const merged = [...serverMsgs, ...pendingRef.current]
      merged.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a._localTime ?? 0
        const tb = b.createdAt?.toMillis?.() ?? b._localTime ?? 0
        return ta - tb
      })
      setMessages(merged)
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }))
    })
    return unsub
  }, [activeChatId])

  // Auto-grow textarea
  function onInputChange(e) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    if (activeChatId && user) {
      setTyping(activeChatId, user.uid, true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(activeChatId, user.uid, false)
      }, 2000)
    }
  }

  function isMessageRead(msg) {
    if (!otherReadAt || !msg.createdAt?.toMillis) return false
    return msg.createdAt.toMillis() <= otherReadAt
  }

  async function startWordle(word) {
    await commitMessage(
      {
        type: 'game',
        gameType: 'wordle',
        gameState: { word, guesses: [], status: 'playing', startedBy: user.uid },
      },
      { type: 'text', text: '🎮 Wordle' },
    )
  }

  async function startTrivia(question) {
    await commitMessage(
      {
        type: 'game',
        gameType: 'trivia',
        gameState: {
          question: question.q,
          options: question.options,
          answer: question.answer,
          picks: {},
          status: 'playing',
        },
      },
      { type: 'text', text: '🎮 Trivia' },
    )
  }

  async function submitWordleGuess(msg, guess) {
    if (!msg.id || msg._pending) return
    const answer = msg.gameState.word
    const score = scoreGuess(guess, answer)
    const guesses = [...(msg.gameState.guesses || []), { word: guess, score }]
    const won = guess === answer
    const lost = !won && guesses.length >= 6
    const msgRef = doc(db, 'conversations', activeChatId, 'messages', msg.id)
    try {
      await updateDoc(msgRef, {
        gameState: {
          ...msg.gameState,
          guesses,
          status: won ? 'won' : lost ? 'lost' : 'playing',
        },
      })
    } catch {
      toast.error('Could not submit guess')
    }
  }

  async function submitTriviaAnswer(msg, optionIndex) {
    if (!msg.id || msg._pending) return
    const picks = { ...(msg.gameState.picks || {}), [user.uid]: optionIndex }
    const msgRef = doc(db, 'conversations', activeChatId, 'messages', msg.id)
    const memberCount = 2
    const done = Object.keys(picks).length >= memberCount
    try {
      await updateDoc(msgRef, {
        gameState: { ...msg.gameState, picks, status: done ? 'done' : 'playing' },
      })
    } catch {
      toast.error('Could not submit answer')
    }
  }

  function pushOptimistic(partial) {
    const clientId = crypto.randomUUID()
    const optimistic = {
      id: `pending-${clientId}`,
      clientId,
      senderId: user.uid,
      senderName: userProfile?.displayName || '',
      _pending: true,
      _localTime: Date.now(),
      createdAt: { toMillis: () => Date.now() },
      ...partial,
    }
    pendingRef.current = [...pendingRef.current, optimistic]
    setMessages(prev => [...prev, optimistic])
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }))
    return clientId
  }

  function removeOptimistic(clientId) {
    pendingRef.current = pendingRef.current.filter(m => m.clientId !== clientId)
    setMessages(prev => prev.filter(m => m.clientId !== clientId))
  }

  async function commitMessage(payload, lastPreview) {
    const batch = writeBatch(db)
    const msgRef = doc(collection(db, 'conversations', activeChatId, 'messages'))
    batch.set(msgRef, {
      ...payload,
      senderId: user.uid,
      senderName: userProfile?.displayName || '',
      createdAt: serverTimestamp(),
    })
    batch.set(
      doc(db, 'conversations', activeChatId),
      {
        updatedAt: serverTimestamp(),
        lastMessage: { senderId: user.uid, ...lastPreview },
      },
      { merge: true },
    )
    await batch.commit()
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

    const clientId = pushOptimistic({ type: 'text', text })
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    setSending(true)
    if (activeChatId && user) setTyping(activeChatId, user.uid, false)
    try {
      await commitMessage(
        { type: 'text', text, clientId },
        { type: 'text', text: text.slice(0, 40) },
      )
    } catch (err) {
      console.error('sendMessage error:', err)
      removeOptimistic(clientId)
      toast.error(`Send failed: ${err?.message || 'unknown error'}`)
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  async function sendPhoto(file) {
    if (!file || sending) return
    setSending(true)
    const preview = URL.createObjectURL(file)
    const clientId = pushOptimistic({ type: 'image', imageData: preview })
    try {
      const imageData = await prepareImageForFirestore(file)
      await commitMessage(
        { type: 'image', imageData, clientId },
        { type: 'image', text: '📷 Photo' },
      )
    } catch (err) {
      console.error('sendPhoto error:', err)
      removeOptimistic(clientId)
      toast.error(err?.message || 'Could not send photo')
    } finally {
      setSending(false)
    }
  }

  async function sendVoice(blob, durationSec) {
    if (!blob || sending) return
    setSending(true)
    const clientId = pushOptimistic({
      type: 'audio',
      audioData: URL.createObjectURL(blob),
      audioDuration: durationSec,
    })
    try {
      const audioData = await prepareAudioForFirestore(blob)
      await commitMessage(
        { type: 'audio', audioData, audioDuration: durationSec, clientId },
        { type: 'audio', text: '🎤 Voice message' },
      )
    } catch (err) {
      console.error('sendVoice error:', err)
      removeOptimistic(clientId)
      toast.error(err?.message || 'Could not send voice message')
    } finally {
      setSending(false)
    }
  }

  async function startRecording() {
    const mime = getAudioMimeType()
    if (!mime) {
      toast.error('Voice recording not supported in this browser')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      recordChunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(recordTimerRef.current)
        const blob = new Blob(recordChunksRef.current, { type: mime })
        const duration = recordSecondsRef.current
        setRecording(false)
        setRecordSeconds(0)
        recordSecondsRef.current = 0
        if (blob.size > 0 && duration >= 1) sendVoice(blob, duration)
        else if (duration > 0) toast.error('Hold longer to record')
      }
      mediaRecorderRef.current = recorder
      recorder.start(200)
      setRecording(true)
      setRecordSeconds(0)
      recordSecondsRef.current = 0
      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1
        setRecordSeconds(recordSecondsRef.current)
      }, 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
    }
    clearInterval(recordTimerRef.current)
    setRecording(false)
    setRecordSeconds(0)
    recordChunksRef.current = []
  }

  function startCall(type) {
    setCallState('outgoing', { type, remoteUser: activeChatUser, conversationId: activeChatId })
  }

  async function toggleReaction(msg, emoji) {
    if (!msg.id || msg.id.startsWith('pending') || msg._pending) return
    const msgRef = doc(db, 'conversations', activeChatId, 'messages', msg.id)
    const reactions = { ...(msg.reactions || {}) }
    const list = [...(reactions[emoji] || [])]
    const idx = list.indexOf(user.uid)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(user.uid)
    if (list.length) reactions[emoji] = list
    else delete reactions[emoji]
    try {
      await updateDoc(msgRef, { reactions })
    } catch {
      toast.error('Could not add reaction')
    }
    setReactionTarget(null)
  }

  return (
    <motion.div className="h-full flex flex-col" style={{ background: theme.bg }}>
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-3 py-3 border-b"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
          background: theme.header,
          backdropFilter: 'saturate(180%) blur(40px)',
          WebkitBackdropFilter: 'saturate(180%) blur(40px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={clearActiveChat}
          className="w-9 h-9 flex items-center justify-center rounded-full -ml-1 text-white/80"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </motion.button>

        <Avatar user={activeChatUser} size={36} />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] truncate leading-tight">
            {activeChatUser?.displayName}
          </p>
          <p className="text-[11px] text-white/35 truncate">
            {otherTyping
              ? <span style={{ color: ACCENT }}>typing…</span>
              : `@${activeChatUser?.username}`}
          </p>
        </div>

        <div className="flex gap-1">
          {[
            { icon: <Gamepad2 size={17} strokeWidth={1.8} />, action: () => setShowGames(true) },
            { icon: <Palette size={17} strokeWidth={1.8} />, action: () => setShowThemePicker(true) },
            { icon: <Phone size={17} strokeWidth={1.8} />, action: () => startCall('audio') },
            { icon: <Video size={17} strokeWidth={1.8} />, action: () => startCall('video') },
          ].map((b, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              onClick={b.action}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              {b.icon}
            </motion.button>
          ))}
        </div>
      </div>
      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-1 flex flex-col gap-1">
        {messages.map((msg, i) => {
          const isMine  = msg.senderId === user.uid
          const ts      = msg.createdAt?.toDate?.()
          const prev    = messages[i - 1]
          const showTs  = !prev || (ts && prev.createdAt?.toDate &&
            ts - prev.createdAt.toDate() > 5 * 60 * 1000)

          return (
            <React.Fragment key={msg.id}>
              {showTs && ts && (
                <div className="text-center text-[11px] text-white/20 my-3">
                  {format(ts, isToday(ts) ? 'HH:mm' : 'MMM d, HH:mm')}
                </div>
              )}
              <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <motion.div
                  initial={msg._pending ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: msg._pending ? 0.7 : 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <button
                    type="button"
                    onClick={() => setReactionTarget(reactionTarget === msg.id ? null : msg.id)}
                    onDoubleClick={() => toggleReaction(msg, '👍')}
                    className="text-left rounded-2xl px-4 py-2.5 max-w-[78%] text-[15px] leading-relaxed"
                    style={{
                      background: isMine ? theme.sent : theme.received,
                      color: '#fff',
                      borderRadius: '20px',
                      borderBottomRightRadius: isMine ? '6px' : '20px',
                      borderBottomLeftRadius: isMine ? '20px' : '6px',
                    }}
                  >
                    <MessageContent
                      msg={msg}
                      isMine={isMine}
                      viewerUid={user.uid}
                      onWordleGuess={submitWordleGuess}
                      onTriviaAnswer={submitTriviaAnswer}
                    />
                  </button>
                </motion.div>
                {isMine && !msg._pending && msg.createdAt?.toMillis && (
                  <span className="flex items-center gap-0.5 mt-0.5 mr-1 text-white/30">
                    {isMessageRead(msg)
                      ? <CheckCheck size={12} style={{ color: ACCENT }} />
                      : <Check size={12} />}
                  </span>
                )}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {Object.entries(msg.reactions).map(([emoji, uids]) =>
                      uids?.length ? (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(msg, emoji)}
                          className="text-[12px] px-2 py-0.5 rounded-full"
                          style={{
                            background: uids.includes(user.uid)
                              ? `rgba(${ACCENT_RGB}, 0.25)`
                              : 'rgba(255,255,255,0.08)',
                          }}
                        >
                          {emoji} {uids.length}
                        </button>
                      ) : null,
                    )}
                  </div>
                )}
                {reactionTarget === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex gap-1 mt-1 px-1 py-1 rounded-full"
                    style={{ background: 'rgba(44,44,46,0.95)' }}
                  >
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(msg, emoji)}
                        className="text-lg px-1 active:scale-110 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </React.Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div
        className="px-3 pt-2 flex flex-col gap-2 border-t"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        {recording && (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,69,58,0.15)' }}>
            <span className="text-[13px] text-red-400 font-medium">
              Recording {recordSeconds}s…
            </span>
            <button type="button" onClick={cancelRecording} className="text-[12px] text-white/50 px-2">
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) sendPhoto(f)
              e.target.value = ''
            }}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => photoInputRef.current?.click()}
            disabled={sending || recording}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <ImagePlus size={18} strokeWidth={1.8} className="text-white/70" />
          </motion.button>
          <div
            className="flex-1 rounded-[22px] px-4 py-2.5 flex items-end gap-2"
            style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Message"
              rows={1}
              disabled={recording}
              className="flex-1 bg-transparent text-white text-[15px] resize-none outline-none placeholder-white/30 disabled:opacity-50"
              style={{ lineHeight: '1.45', maxHeight: 120 }}
            />
          </div>
          {input.trim() ? (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={sendMessage}
              disabled={sending || recording}
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30"
              style={{ background: ACCENT }}
            >
              <Send size={16} strokeWidth={2} className="translate-x-[1px] -translate-y-[1px]" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={recording ? stopRecording : undefined}
              onTouchStart={e => { e.preventDefault(); startRecording() }}
              onTouchEnd={e => { e.preventDefault(); stopRecording() }}
              disabled={sending}
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: recording ? '#ff453a' : 'rgba(255,255,255,0.12)' }}
            >
              <Mic size={18} strokeWidth={1.8} className={recording ? 'text-white' : 'text-white/70'} />
            </motion.button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showGames && (
          <GamesSheet
            onClose={() => setShowGames(false)}
            onStartWordle={startWordle}
            onStartTrivia={startTrivia}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showThemePicker && (
          <ChatThemePicker
            currentThemeId={themeId}
            onSelect={id => {
              setChatTheme(activeChatId, id)
              setThemeId(id)
              setShowThemePicker(false)
            }}
            onClose={() => setShowThemePicker(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function MessageContent({ msg, isMine, viewerUid, onWordleGuess, onTriviaAnswer }) {
  if (msg.type === 'game' && msg.gameType === 'wordle') {
    return <WordleGameMessage msg={msg} isMine={isMine} onGuess={onWordleGuess} />
  }
  if (msg.type === 'game' && msg.gameType === 'trivia') {
    return (
      <TriviaGameMessage
        msg={msg}
        isMine={isMine}
        viewerUid={viewerUid}
        onAnswer={onTriviaAnswer}
      />
    )
  }
  const imgSrc = msg.imageData || msg.imageUrl
  if (msg.type === 'image' && imgSrc) {
    return (
      <img
        src={imgSrc}
        alt="Shared"
        className="max-w-[220px] max-h-[280px] rounded-xl object-cover"
        loading="lazy"
      />
    )
  }
  const audioSrc = msg.audioData || msg.audioUrl
  if (msg.type === 'audio' && audioSrc) {
    return <VoiceBubble url={audioSrc} duration={msg.audioDuration} isMine={isMine} />
  }
  return <span>{msg.text || ''}</span>
}

function VoiceBubble({ url, duration, isMine }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el.play()
      setPlaying(true)
    }
  }

  const label = duration
    ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
    : 'Voice'

  return (
    <button type="button" onClick={toggle} className="flex items-center gap-2 min-w-[120px]">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} preload="metadata" />
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </span>
      <span className="text-[14px]">{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared sheet / modal primitive
// ─────────────────────────────────────────────────────────────
function Sheet({ children, onClose, title }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
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
          backdropFilter: 'saturate(180%) blur(40px)',
          WebkitBackdropFilter: 'saturate(180%) blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          maxHeight: '85dvh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-5 py-3 mb-1">
          <span className="font-semibold text-[17px]">{title}</span>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <X size={14} strokeWidth={2.5} className="text-white/70" />
          </motion.button>
        </div>

        {children}
      </motion.div>
    </motion.div>
  )
}

function PromptShareSheet({ prompt, convos, onClose }) {
  const { setActiveChat } = useStore()

  return (
    <Sheet onClose={onClose} title="Share daily prompt">
      <div className="px-5 pb-4">
        <p className="text-[14px] text-white/70 mb-4 leading-relaxed">{prompt}</p>
        {convos.length === 0 ? (
          <p className="text-center text-white/30 text-[13px] py-4">Start a chat first</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {convos.map(c => (
              <motion.button
                key={c.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveChat(c.id, c.otherUser)
                  onClose()
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:bg-white/[0.05]"
              >
                <Avatar user={c.otherUser} size={40} />
                <span className="font-medium text-[14px]">{c.otherUser?.displayName}</span>
              </motion.button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-white/30 mt-3 text-center">
          Opens chat — paste or send the prompt
        </p>
      </div>
    </Sheet>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
