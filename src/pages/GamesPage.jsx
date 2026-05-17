import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Trophy, User, Bot } from 'lucide-react'
import { ACCENT, ACCENT_SOFT } from '../lib/accent'

const spring = { type: 'spring', stiffness: 450, damping: 24, mass: 0.5 }
const pieceSpring = { type: 'spring', stiffness: 500, damping: 14, mass: 0.4 }

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
]

function calcWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] }
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: null }
  return null
}

// Minimax (hard mode)
function minimax(board, depth, isMax, ai, human) {
  const r = calcWinner(board)
  if (r) {
    if (r.winner === ai) return 10 - depth
    if (r.winner === human) return depth - 10
    return 0
  }
  let best = isMax ? -Infinity : Infinity
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = isMax ? ai : human
      const score = minimax(board, depth + 1, !isMax, ai, human)
      board[i] = null
      best = isMax ? Math.max(best, score) : Math.min(best, score)
    }
  }
  return best
}

function getBestMove(board, ai, human) {
  let bestScore = -Infinity, bestMove = -1
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = ai
      const score = minimax(board, 0, false, ai, human)
      board[i] = null
      if (score > bestScore) { bestScore = score; bestMove = i }
    }
  }
  return bestMove
}

function getRandomMove(board) {
  const empty = board.reduce((acc, cell, i) => (cell ? acc : [...acc, i]), [])
  if (empty.length === 0) return -1
  // 40% chance of optimal move, 60% random
  if (Math.random() < 0.4) {
    const best = getBestMove(board, 'O', 'X')
    if (best >= 0) return best
  }
  return empty[Math.floor(Math.random() * empty.length)]
}

// ── Win line geometry ────────────────────────────────────────
const CELL = 76, GAP = 6, PAD = 12, STEP = CELL + GAP
const CENTERS = [0,1,2,3,4,5,6,7,8].map(i => {
  const row = Math.floor(i / 3), col = i % 3
  return { x: PAD + col * STEP + CELL / 2, y: PAD + row * STEP + CELL / 2 }
})

export default function GamesPage() {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [scores, setScores] = useState({ X: 0, O: 0 })
  const [result, setResult] = useState(null)
  const [mode, setMode] = useState('bot')
  const [difficulty, setDifficulty] = useState('easy')
  const botThinking = useRef(false)

  const winnerData = useMemo(() => calcWinner(board), [board])

  // Bot auto-play
  useEffect(() => {
    if (mode !== 'bot' || winnerData || botThinking.current || board.every(Boolean)) return
    if (!xIsNext) {
      botThinking.current = true
      const delay = difficulty === 'easy' ? 500 : 300
      const timer = setTimeout(() => {
        setBoard(prev => {
          const next = [...prev]
          const move = difficulty === 'easy' ? getRandomMove(next) : getBestMove(next, 'O', 'X')
          if (move >= 0) next[move] = 'O'
          return next
        })
        setXIsNext(true)
        botThinking.current = false
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [xIsNext, mode, difficulty, winnerData, board])

  // Check winner
  useEffect(() => {
    const w = calcWinner(board)
    if (w) {
      if (w.winner !== 'draw') setScores(s => ({ ...s, [w.winner]: s[w.winner] + 1 }))
      setTimeout(() => setResult(w), 150)
    }
  }, [board])

  const handleMove = useCallback((i) => {
    if (board[i] || winnerData || botThinking.current) return
    if (mode === 'bot' && !xIsNext) return
    const next = [...board]
    next[i] = xIsNext ? 'X' : 'O'
    setBoard(next)
    setXIsNext(!xIsNext)
  }, [board, xIsNext, winnerData, mode])

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    setResult(null)
    botThinking.current = false
  }, [])

  const resetScores = useCallback(() => {
    setScores({ X: 0, O: 0 })
    resetBoard()
  }, [resetBoard])

  const toggleMode = useCallback(() => {
    setMode(m => m === 'bot' ? 'friend' : 'bot')
    resetBoard()
  }, [resetBoard])

  const toggleDifficulty = useCallback(() => {
    setDifficulty(d => d === 'easy' ? 'hard' : 'easy')
    resetBoard()
  }, [resetBoard])

  const status = result
    ? result.winner === 'draw' ? "It's a draw" : `${result.winner} wins!`
    : mode === 'bot'
      ? xIsNext ? 'Your turn' : 'Bot…'
      : `${xIsNext ? 'X' : 'O'} to play`

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,69,58,0.04) 0%, rgba(191,90,242,0.04) 50%, transparent 70%)' }}
      />

      <div
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
        className="px-4 pb-2 flex-shrink-0 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="flex items-center justify-between mb-1"
        >
          <span className="text-[24px] font-bold tracking-tight">Tic Tac Toe</span>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={toggleDifficulty}
              className="px-2.5 py-1.5 rounded-full text-[10px] font-semibold tracking-wider transition-colors"
              style={{
                background: difficulty === 'easy' ? '#30d15825' : `${ACCENT}25`,
                color: difficulty === 'easy' ? '#30d158' : ACCENT,
              }}
            >
              {difficulty === 'easy' ? 'Easy' : 'Hard'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={toggleMode}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-colors"
              style={{
                background: mode === 'bot' ? `${ACCENT}20` : 'rgba(255,255,255,0.08)',
                color: mode === 'bot' ? ACCENT : 'rgba(255,255,255,0.5)',
              }}
            >
              {mode === 'bot' ? <Bot size={11} /> : <User size={11} />}
              {mode === 'bot' ? 'Bot' : '2P'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={resetBoard}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <RotateCcw size={11} strokeWidth={1.8} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 gap-3">
        {/* Score */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="glass-pill rounded-2xl px-5 py-2 flex items-center gap-5"
        >
          <ScoreBadge player="X" score={scores.X} active={!result && xIsNext} color="#ff453a" />
          <span className="text-white/20 text-[10px] font-medium">VS</span>
          <ScoreBadge player="O" score={scores.O} active={!result && !xIsNext} color="#5ac8fa" />
        </motion.div>

        {/* Status */}
        <motion.p
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.08 }}
          className="text-[11px] text-white/40 font-medium tracking-wide"
        >
          {result ? (
            <span style={{ color: result.winner === 'draw' ? 'rgba(255,255,255,0.5)' : ACCENT }}>
              {result.winner === 'draw' ? "It's a draw" : `${result.winner} wins!`}
            </span>
          ) : (
            <span style={{ color: xIsNext ? '#ff453a' : '#5ac8fa' }}>{status}</span>
          )}
        </motion.p>

        {/* Board */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="relative"
        >
          {result?.line && (() => {
            const a = CENTERS[result.line[0]], b = CENTERS[result.line[2]]
            const dx = b.x - a.x, dy = b.y - a.y
            const len = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx) * (180 / Math.PI)
            return (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  left: a.x,
                  top: a.y - 2,
                  width: len,
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: 'left',
                }}
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2, ...spring }}
                  className="h-[3px] rounded-full origin-left"
                  style={{
                    background: ACCENT,
                    boxShadow: '0 0 10px rgba(255,69,58,0.5)',
                  }}
                />
              </div>
            )
          })()}

          <div
            className="grid grid-cols-3 gap-1.5 p-3 rounded-3xl"
            style={{
              background: 'rgba(28,28,30,0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            {board.map((cell, i) => {
              const isBotTurn = mode === 'bot' && !xIsNext
              return (
                <motion.button
                  key={i}
                  whileTap={!cell && !winnerData && !isBotTurn ? { scale: 0.92 } : {}}
                  onClick={() => handleMove(i)}
                  className="w-[76px] h-[76px] rounded-xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: result?.line?.includes(i) ? `${ACCENT}15` : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {cell === 'X' && (
                      <motion.span
                        key={`x-${i}`}
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={pieceSpring}
                        className="text-[34px] font-bold select-none"
                        style={{ color: '#ff453a', textShadow: '0 0 20px rgba(255,69,58,0.3)' }}
                      >
                        X
                      </motion.span>
                    )}
                    {cell === 'O' && (
                      <motion.span
                        key={`o-${i}`}
                        initial={{ scale: 0, rotate: 30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={pieceSpring}
                        className="text-[34px] font-bold select-none"
                        style={{ color: '#5ac8fa', textShadow: '0 0 20px rgba(90,200,250,0.3)' }}
                      >
                        O
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!cell && !winnerData && !isBotTurn && (
                    <motion.div
                      initial={false}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        background: xIsNext
                          ? 'radial-gradient(circle, rgba(255,69,58,0.06) 0%, transparent 70%)'
                          : 'radial-gradient(circle, rgba(90,200,250,0.06) 0%, transparent 70%)',
                        opacity: 0,
                      }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Actions */}
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.12 }}
            className="flex items-center gap-3"
          >
            {result.winner !== 'draw' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, ...spring }}
              >
                <Trophy size={18} color={ACCENT} />
              </motion.div>
            )}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={resetBoard}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              Play again
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={resetScores}
              className="px-4 py-2 rounded-xl text-[12px] font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              Reset
            </motion.button>
          </motion.div>
        )}

        <p className="text-[9px] text-white/12 mt-1">
          {mode === 'bot' ? `You are X · Bot is O (${difficulty})` : 'Two players'}
        </p>
      </div>
    </div>
  )
}

function ScoreBadge({ player, score, active, color }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ scale: active ? 1.1 : 1, opacity: active ? 1 : 0.5 }}
        transition={{ duration: 0.12 }}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
        style={{
          background: active ? `${color}25` : 'rgba(255,255,255,0.05)',
          color: active ? color : 'rgba(255,255,255,0.4)',
        }}
      >
        {player}
      </motion.div>
      <motion.span
        key={score}
        initial={{ y: -3, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.1 }}
        className="text-[15px] font-semibold tabular-nums"
        style={{ color }}
      >
        {score}
      </motion.span>
    </div>
  )
}
