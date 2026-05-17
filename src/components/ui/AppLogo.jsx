import React from 'react'

export default function AppLogo({ size = 36 }) {
  const inner = Math.round(size * 0.52)
  const fontSize = Math.round(inner * 0.72)
  return (
    <span
      className="flex items-center justify-center font-bold select-none"
      style={{
        width: size,
        height: size,
        background: '#fff',
        borderRadius: size * 0.28,
      }}
    >
      <span style={{ fontSize, color: '#000', lineHeight: 1, letterSpacing: '-0.04em' }}>
        4
      </span>
    </span>
  )
}
