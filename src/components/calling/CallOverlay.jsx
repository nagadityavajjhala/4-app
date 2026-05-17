import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../lib/store'
import Avatar from '../ui/Avatar'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Minimize2, Maximize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { startRinging, stopRinging } from '../../lib/ringtone'
import {
  writeRingingCall,
  writeCallAnswer,
  endCallSignal,
  pushIceCandidate,
  listenCallSignal,
  listenIceCandidates,
  readCallSignal,
  removeCallSignal,
} from '../../lib/callSignaling'

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

function getMediaConstraints(isVideo) {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
    },
    video: isVideo
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        }
      : false,
  }
}

function preferHighQualityAudio(sdp) {
  return sdp.replace(/a=fmtp:111[^\r\n]*/g, match => {
    if (match.includes('maxaveragebitrate')) return match
    return `${match};maxaveragebitrate=510000;stereo=0`
  })
}

export default function CallOverlay() {
  const { callState, callData, setCallState, user } = useStore()
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [statusLabel, setStatusLabel] = useState('')

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const startTimeRef = useRef(null)
  const unsubsRef = useRef([])
  const endedRef = useRef(false)
  const seenCandidatesRef = useRef(new Set())
  const pendingIceRef = useRef([])
  const roleRef = useRef('caller')

  const [minimized, setMinimized] = useState(false)

  const isVideo = callData?.type === 'video'
  const conversationId = callData?.conversationId
  const myUid = user?.uid

  const addUnsub = useCallback(fn => {
    unsubsRef.current.push(fn)
  }, [])

  const cleanupMedia = useCallback(() => {
    unsubsRef.current.forEach(fn => fn())
    unsubsRef.current = []
    seenCandidatesRef.current.clear()
    pendingIceRef.current = []
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
  }, [])

  const getSignalPathUid = useCallback(() => {
    return roleRef.current === 'callee' ? myUid : callData?.remoteUser?.uid
  }, [myUid, callData?.remoteUser?.uid])

  const hangUp = useCallback(async () => {
    if (endedRef.current) return
    endedRef.current = true
    const pathUid = getSignalPathUid()
    if (pathUid && conversationId) {
      await endCallSignal(pathUid, conversationId)
    }
    cleanupMedia()
    setCallState(null)
  }, [getSignalPathUid, conversationId, cleanupMedia, setCallState])

  const attachRemoteStream = useCallback(stream => {
    if (isVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream
    }
  }, [isVideo])

  const flushPendingIce = useCallback(pc => {
    pendingIceRef.current.forEach(data => {
      pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {})
    })
    pendingIceRef.current = []
  }, [])

  const addRemoteIce = useCallback((pc, data) => {
    if (!data) return
    if (pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {})
    } else {
      pendingIceRef.current.push(data)
    }
  }, [])

  const setupPeerConnection = useCallback((stream, role, pathUid) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc
    roleRef.current = role

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = e => {
      if (e.streams[0]) attachRemoteStream(e.streams[0])
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('active', callData)
        setStatusLabel('')
        if (!startTimeRef.current) startTimeRef.current = Date.now()
      } else if (pc.connectionState === 'connecting') {
        setStatusLabel('Connecting…')
      }
    }

    pc.onicecandidate = e => {
      if (e.candidate && pathUid && conversationId) {
        pushIceCandidate(pathUid, conversationId, role, e.candidate)
      }
    }

    const remoteRole = role === 'caller' ? 'callee' : 'caller'
    addUnsub(
      listenIceCandidates(pathUid, conversationId, remoteRole, (data, key) => {
        if (!data || seenCandidatesRef.current.has(key)) return
        seenCandidatesRef.current.add(key)
        addRemoteIce(pc, data)
      }),
    )

    return pc
  }, [conversationId, callData, addUnsub, attachRemoteStream, setCallState, addRemoteIce])

  const acquireMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(isVideo))
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      return stream
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('permission')) {
        throw new Error('Microphone permission denied. Grant mic access in your browser/phone settings.')
      }
      throw err
    }
  }, [isVideo])

  const startOutgoingCall = useCallback(async () => {
    const calleeUid = callData?.remoteUser?.uid
    if (!conversationId || !myUid || !calleeUid) return
    roleRef.current = 'caller'
    setStatusLabel('Calling…')

    try {
      const stream = await acquireMedia()
      await removeCallSignal(calleeUid, conversationId).catch(() => {})

      const pc = setupPeerConnection(stream, 'caller', calleeUid)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      })
      const tunedOffer = { ...offer, sdp: preferHighQualityAudio(offer.sdp) }
      await pc.setLocalDescription(tunedOffer)

      await writeRingingCall({
        calleeId: calleeUid,
        conversationId,
        callerId: myUid,
        type: callData?.type || 'audio',
        offer: tunedOffer,
      })

      addUnsub(
        listenCallSignal(calleeUid, conversationId, async data => {
          if (!data) return
          if (data.status === 'ended') {
            hangUp()
            return
          }
          if (data.answer && !pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            flushPendingIce(pc)
          }
        }),
      )
    } catch (err) {
      console.error('Outgoing call error:', err)
      toast.error(err?.message || 'Call failed')
      hangUp()
    }
  }, [
    conversationId, myUid, callData, isVideo, acquireMedia,
    setupPeerConnection, addUnsub, hangUp, flushPendingIce,
  ])

  const answerIncomingCall = useCallback(async () => {
    if (!conversationId || !myUid) return
    roleRef.current = 'callee'
    setStatusLabel('Connecting…')

    try {
      const data = await readCallSignal(myUid, conversationId)
      if (!data?.offer || data.status === 'ended') {
        hangUp()
        return
      }

      const stream = await acquireMedia()
      const pc = setupPeerConnection(stream, 'callee', myUid)
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      flushPendingIce(pc)

      const answer = await pc.createAnswer()
      const tunedAnswer = { ...answer, sdp: preferHighQualityAudio(answer.sdp) }
      await pc.setLocalDescription(tunedAnswer)

      await writeCallAnswer(myUid, conversationId, tunedAnswer)

      addUnsub(
        listenCallSignal(myUid, conversationId, d => {
          if (d?.status === 'ended') hangUp()
        }),
      )
    } catch (err) {
      console.error('Answer call error:', err)
      toast.error(err?.message || 'Could not answer call')
      hangUp()
    }
  }, [
    conversationId, myUid, acquireMedia, setupPeerConnection,
    addUnsub, hangUp, flushPendingIce,
  ])

  const declineIncomingCall = useCallback(async () => {
    endedRef.current = true
    if (myUid && conversationId) {
      await endCallSignal(myUid, conversationId)
    }
    cleanupMedia()
    setCallState(null)
  }, [myUid, conversationId, cleanupMedia, setCallState])

  useEffect(() => {
    if (callState !== 'incoming' || !conversationId || !myUid) return
    return listenCallSignal(myUid, conversationId, data => {
      if (!data || data.status === 'ended') {
        endedRef.current = true
        cleanupMedia()
        setCallState(null)
      }
    })
  }, [callState, conversationId, myUid, cleanupMedia, setCallState])

  useEffect(() => {
    endedRef.current = false
    if (callState === 'outgoing' && callData?._role !== 'callee') {
      startOutgoingCall()
    }
    return () => {
      if (!endedRef.current && pcRef.current) {
        const pathUid = getSignalPathUid()
        if (pathUid && conversationId) {
          endCallSignal(pathUid, conversationId)
        }
      }
      cleanupMedia()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (callState === 'outgoing') {
      startRinging()
    } else {
      stopRinging()
    }
  }, [callState])

  useEffect(() => {
    if (callState === 'active') {
      if (!startTimeRef.current) startTimeRef.current = Date.now()
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [callState])

  function toggleMute() {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMuted(!muted)
    }
  }

  function toggleVideo() {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setVideoOff(!videoOff)
    }
  }

  function formatDuration(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const displayStatus =
    callState === 'active'
      ? formatDuration(callDuration)
      : statusLabel || (callState === 'outgoing' ? 'Calling…' : 'Incoming call')

  const showMinimized = minimized && callState === 'active'

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Full-screen overlay */}
      {!showMinimized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex flex-col"
        >
          {/* Video */}
          {isVideo ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute top-16 right-4 w-28 h-40 object-cover rounded-2xl border border-white/20 shadow-2xl z-10"
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Avatar user={callData?.remoteUser} size={100} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-xl font-semibold">{callData?.remoteUser?.displayName}</p>
                <p className="text-white/50 text-sm mt-1">{displayStatus}</p>
              </motion.div>
            </div>
          )}

          {/* Minimize button (active call only) */}
          {callState === 'active' && (
            <button
              onClick={() => setMinimized(true)}
              className="absolute top-12 left-4 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <Minimize2 size={16} className="text-white/80" />
            </button>
          )}

          {/* Incoming: answer / decline */}
          {callState === 'incoming' && (
            <div className="absolute bottom-36 left-0 right-0 flex justify-center gap-16">
              <CallButton icon={PhoneOff} onPress={declineIncomingCall} color="#ff453a" large />
              <CallButton
                icon={Phone}
                onPress={() => {
                  setCallState('outgoing', { ...callData, _role: 'callee' })
                  answerIncomingCall()
                }}
                color="#30d158"
                large
              />
            </div>
          )}

          {/* Outgoing / Active: controls */}
          {(callState === 'outgoing' || callState === 'active') && (
            <div className="absolute bottom-0 left-0 right-0 pb-safe pb-10 flex items-center justify-center gap-8">
              <CallButton
                icon={muted ? MicOff : Mic}
                onPress={toggleMute}
                active={muted}
                color="rgba(255,255,255,0.15)"
              />
              <CallButton icon={PhoneOff} onPress={hangUp} color="#ff453a" size={28} large />
              {isVideo && (
                <CallButton
                  icon={videoOff ? VideoOff : Video}
                  onPress={toggleVideo}
                  active={videoOff}
                  color="rgba(255,255,255,0.15)"
                />
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Minimized — remote video as floating window + top bar */}
      {showMinimized && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="fixed bottom-24 right-4 w-32 h-48 object-cover rounded-xl shadow-2xl"
            style={{ zIndex: 60 }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="fixed top-24 left-4 w-20 h-28 object-cover rounded-xl border border-white/20 shadow-xl"
            style={{ zIndex: 61 }}
          />
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 px-3 pt-2 pb-2"
            style={{
              background: 'rgba(10,10,12,0.92)',
              backdropFilter: 'saturate(200%) blur(50px)',
              WebkitBackdropFilter: 'saturate(200%) blur(50px)',
            }}
          >
            <div className="flex items-center justify-between rounded-2xl px-4 py-2.5"
              style={{ background: 'rgba(44,44,46,0.6)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar user={callData?.remoteUser} size={32} />
                <div className="min-w-0">
                  <p className="text-white text-[14px] font-medium truncate">
                    {callData?.remoteUser?.displayName || 'Call'}
                  </p>
                  <p className="text-white/40 text-[11px]">{displayStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: muted ? ACCENT : 'rgba(255,255,255,0.1)' }}
                >
                  {muted ? <MicOff size={14} className="text-white" /> : <Mic size={14} className="text-white/70" />}
                </button>
                <button
                  onClick={() => setMinimized(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <Maximize2 size={14} className="text-white/70" />
                </button>
                <button
                  onClick={hangUp}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: '#ff453a' }}
                >
                  <PhoneOff size={14} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  )
}

function CallButton({ icon: Icon, onPress, color, active, large, size = 22 }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onPress}
      className="rounded-full flex items-center justify-center shadow-lg"
      style={{
        background: active ? 'rgba(255,255,255,0.3)' : color,
        width: large ? 72 : 56,
        height: large ? 72 : 56,
      }}
    >
      <Icon size={size} strokeWidth={1.5} />
    </motion.button>
  )
}
