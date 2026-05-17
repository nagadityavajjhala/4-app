import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Newspaper } from 'lucide-react'
import { useStore } from '../../lib/store'

const TABS = [
  { id: 'chats', icon: MessageCircle, label: 'Chats' },
  { id: 'news',  icon: Newspaper,     label: 'News'  },
]

export default function TabBar() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <div className="relative z-20 glass-nav">
      <div className="flex items-center justify-around px-8 pt-2 pb-safe">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1 py-2 px-10 relative"
            >
              {active && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
              <motion.div
                animate={{ scale: active ? 1 : 0.92 }}
                transition={{ duration: 0.15 }}
                className="relative z-10"
              >
                <Icon
                  size={23}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? '#fff' : 'rgba(255,255,255,0.38)'}
                />
              </motion.div>
              <span
                className="relative z-10 text-[10px] font-medium"
                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
