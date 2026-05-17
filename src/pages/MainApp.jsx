import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import ChatsPage from './ChatsPage'
import NewsPage from './NewsPage'
import GamesPage from './GamesPage'
import TabBar from '../components/ui/TabBar'
import CallOverlay from '../components/calling/CallOverlay'
import CallListener from '../components/calling/CallListener'

const tabs = {
  play: GamesPage,
  chats: ChatsPage,
  news: NewsPage,
}

const pageSpring = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }

export default function MainApp() {
  const { activeTab, callState } = useStore()
  const ActivePage = tabs[activeTab] || ChatsPage

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <CallListener />
      <AnimatePresence>{callState && <CallOverlay />}</AnimatePresence>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={pageSpring}
            className="h-full"
          >
            <ActivePage />
          </motion.div>
        </AnimatePresence>
      </div>

      <TabBar />
    </div>
  )
}
