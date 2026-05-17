import React from 'react'
import { motion } from 'framer-motion'
import { X, Grid3x3, HelpCircle } from 'lucide-react'
import { pickWordleWord } from '../../lib/wordleWords'
import { pickTriviaQuestion } from '../../lib/triviaQuestions'
import { ACCENT } from '../../lib/accent'

export default function GamesSheet({ onClose, onStartWordle, onStartTrivia }) {
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
          <span className="font-semibold text-[17px]">Play a game</span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <X size={14} />
          </button>
        </div>
        <motion.div className="grid grid-cols-2 gap-3">
          <GameCard
            icon={<Grid3x3 size={22} />}
            title="Wordle"
            desc="Guess the 5-letter word"
            onClick={() => {
              const seed = Math.floor(Math.random() * 10000)
              onStartWordle(pickWordleWord(seed), seed)
              onClose()
            }}
          />
          <GameCard
            icon={<HelpCircle size={22} />}
            title="Trivia"
            desc="Quick quiz challenge"
            onClick={() => {
              const seed = Math.floor(Math.random() * 10000)
              onStartTrivia(pickTriviaQuestion(seed), seed)
              onClose()
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function GameCard({ icon, title, desc, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span style={{ color: ACCENT }}>{icon}</span>
      <span className="font-semibold text-[15px]">{title}</span>
      <span className="text-[12px] text-white/40">{desc}</span>
    </motion.button>
  )
}
