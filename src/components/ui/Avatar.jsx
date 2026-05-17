import React from 'react'
import { motion } from 'framer-motion'
import { ACCENT } from '../../lib/accent'

export default function Avatar({ user, size = 40, showOnline = false, online = false, glow = false }) {
  const initials = (user?.displayName || user?.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const color = user?.avatarColor || ACCENT

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      {glow && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            width: size * 2.2,
            height: size * 2.2,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${color}35 0%, ${color}15 40%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
        />
      )}

      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName || ''}
          className="rounded-full object-cover w-full h-full relative z-10"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-semibold select-none relative z-10"
          style={{
            width: size,
            height: size,
            background: `${color}15`,
            border: `1px solid ${color}35`,
            fontSize: Math.max(10, size * 0.34),
            color,
          }}
        >
          {initials}
        </div>
      )}

      {showOnline && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-[2.5px] border-black z-10"
          style={{
            width: Math.max(8, size * 0.27),
            height: Math.max(8, size * 0.27),
            background: online ? '#30d158' : '#3a3a3c',
          }}
        />
      )}
    </div>
  )
}
