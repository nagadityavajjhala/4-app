import React from 'react'

export default function Avatar({ user, size = 40, showOnline = false, online = false }) {
  const initials = (user?.displayName || user?.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const color = user?.avatarColor || '#ff453a'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName || ''}
          className="rounded-full object-cover w-full h-full"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-semibold select-none"
          style={{
            width: size,
            height: size,
            background: `${color}1a`,
            border: `1.5px solid ${color}50`,
            fontSize: Math.max(10, size * 0.34),
            color,
          }}
        >
          {initials}
        </div>
      )}

      {showOnline && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-[2px] border-black"
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
