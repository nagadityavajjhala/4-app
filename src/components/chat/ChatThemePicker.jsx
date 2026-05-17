import React from 'react'
import { motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { CHAT_THEMES } from '../../lib/chatThemes'
import { ACCENT } from '../../lib/accent'

export default function ChatThemePicker({ currentThemeId, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="rounded-t-[28px] px-5 pb-8"
        style={{
          background: 'rgba(20,20,22,0.97)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
        }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-[17px]">Chat theme</span>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(CHAT_THEMES).map(theme => (
            <button key={theme.id} type="button" onClick={() => onSelect(theme.id)} className="relative p-3 rounded-2xl text-left" style={{ background: theme.bg, border: currentThemeId === theme.id ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex gap-1 mb-2">
                <div className="h-6 flex-1 rounded-lg" style={{ background: theme.sent }} />
                <div className="h-6 flex-1 rounded-lg" style={{ background: theme.received }} />
              </div>
              <span className="text-[13px] font-medium">{theme.name}</span>
              {currentThemeId === theme.id && <Check size={14} className="absolute top-2 right-2" style={{ color: ACCENT }} />}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
