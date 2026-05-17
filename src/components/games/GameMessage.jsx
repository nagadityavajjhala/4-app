import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ACCENT } from '../../lib/accent'

const TILE_COLORS = {
  correct: '#30d158',
  present: '#ff9f0a',
  absent: 'rgba(255,255,255,0.12)',
}

export function WordleGameMessage({ msg, isMine, onGuess }) {
  const { word, guesses = [], status } = msg.gameState || {}
  const [guess, setGuess] = useState('')
  const done = status === 'won' || status === 'lost'

  function submit() {
    const g = guess.toUpperCase().trim()
    if (g.length !== 5 || done) return
    onGuess(msg, g)
    setGuess('')
  }

  return (
    <motion.div className="p-3 min-w-[200px]">
      <p className="text-[12px] font-semibold mb-2 opacity-80">🎮 Wordle</p>
      <motion.div className="space-y-1">
        {guesses.map((g, i) => (
          <motion.div key={i} className="flex gap-1">
            {g.word.split('').map((ch, j) => (
              <motion.span
                key={j}
                className="w-7 h-7 flex items-center justify-center rounded text-[11px] font-bold"
                style={{ background: TILE_COLORS[g.score[j]] }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>
        ))}
      </motion.div>
      {status === 'won' && (
        <p className="text-[12px] mt-2 text-green-400">Word guessed! 🎉</p>
      )}
      {status === 'lost' && (
        <p className="text-[12px] mt-2 text-white/50">The word was {word}</p>
      )}
      {!done && (
        <motion.div className="flex gap-1 mt-2">
          <input
            value={guess}
            onChange={e => setGuess(e.target.value.slice(0, 5).toUpperCase())}
            maxLength={5}
            placeholder="Guess"
            className="flex-1 rounded-lg px-2 py-1 text-[13px] bg-black/30 outline-none uppercase"
          />
          <button type="button" onClick={submit} className="px-2 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background: ACCENT }}>
            Go
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

export function TriviaGameMessage({ msg, isMine, onAnswer, viewerUid }) {
  const { question, options, answer, picks = {}, status } = msg.gameState || {}
  const myPick = picks[viewerUid]
  const done = status === 'done'

  return (
    <motion.div className="p-3 min-w-[220px] max-w-[260px]">
      <p className="text-[12px] font-semibold mb-2 opacity-80">🎮 Trivia</p>
      <p className="text-[14px] mb-3 leading-snug">{question}</p>
      <motion.div className="space-y-1.5">
        {options?.map((opt, i) => {
          const picked = Object.values(picks).includes(i)
          const showResult = done && (i === answer || picked)
          let bg = 'rgba(255,255,255,0.08)'
          if (showResult && i === answer) bg = 'rgba(48,209,88,0.35)'
          else if (showResult && picked && i !== answer) bg = 'rgba(255,69,58,0.35)'

          return (
            <button
              key={i}
              type="button"
              disabled={done || myPick != null}
              onClick={() => !done && myPick == null && onAnswer(msg, i)}
              className="w-full text-left px-3 py-2 rounded-xl text-[13px] disabled:opacity-70"
              style={{ background: bg }}
            >
              {opt}
            </button>
          )
        })}
      </motion.div>
      {done && (
        <p className="text-[11px] mt-2 text-white/40">
          {myPick === answer ? 'You got it right! ✓' : myPick != null ? 'Nice try!' : 'Game finished'}
        </p>
      )}
    </motion.div>
  )
}
