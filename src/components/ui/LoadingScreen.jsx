import React from 'react'
import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <div
          className="text-white font-bold"
          style={{ fontSize: 88, lineHeight: 1, letterSpacing: '-6px' }}
        >
          4
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-white/40"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
