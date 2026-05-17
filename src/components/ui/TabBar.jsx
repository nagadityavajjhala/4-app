import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Newspaper, Gamepad2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { ACCENT, ACCENT_SOFT } from '../../lib/accent'

const TABS = [
  { id: 'play',  icon: Gamepad2,     label: 'Play'  },
  { id: 'chats', icon: MessageCircle, label: 'Chats' },
  { id: 'news',  icon: Newspaper,     label: 'News'  },
]

const tabSpring = { type: 'spring', stiffness: 600, damping: 28, mass: 0.4 }

export default function TabBar() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <div className="relative z-20 glass-nav">
      <div className="flex items-center justify-around px-4 pt-1.5 pb-safe">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id
          return (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.06 }}
              className="flex flex-col items-center gap-0.5 py-2 px-6 relative"
            >
              {active && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: ACCENT_SOFT }}
                  transition={{ type: 'spring', bounce: 0.15, stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: active ? 1 : 0.85, y: active ? 0 : 1 }}
                transition={tabSpring}
                className="relative z-10"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? ACCENT : 'rgba(255,255,255,0.3)'}
                />
              </motion.div>
              <motion.span
                animate={{ opacity: active ? 1 : 0.4 }}
                transition={{ duration: 0.08 }}
                className="relative z-10 text-[9px] font-medium tracking-wide"
                style={{ color: active ? ACCENT : 'rgba(255,255,255,0.25)' }}
              >
                {label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
