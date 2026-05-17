import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Trophy } from 'lucide-react'
import { ACCENT, ACCENT_SOFT } from '../lib/accent'

const spring = { type: 'spring', stiffness: 350, damping: 20, mass: 0.6 }
const pieceSpring = { type: 'spring', stiffness: 400, damping: 15, mass: 0.5 }

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

export default function GamesPage() {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [scores, setScores] = useState({ X: 0, O: 0 })
  const [result, setResult] = useState(null)
  const [cellEntering, setCellEntering] = useState(null)

  const winnerData = calcWinner(board)

  const handleMove = useCallback((i) => {
    if (board[i] || winnerData) return
    const next = [...board]
    next[i] = xIsNext ? 'X' : 'O'
    setCellEntering(i)
    setTimeout(() => setCellEntering(null), 100)
    setBoard(next)
    setXIsNext(!xIsNext)

    const w = calcWinner(next)
    if (w) {
      if (w.winner !== 'draw') {
        setScores(s => ({ ...s, [w.winner]: s[w.winner] + 1 }))
      }
      setTimeout(() => setResult(w), 250)
    }
  }, [board, xIsNext, winnerData])

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    setResult(null)
  }, [])

  const resetScores = useCallback(() => {
    setScores({ X: 0, O: 0 })
    resetBoard()
  }, [resetBoard])

  const status = result
    ? result.winner === 'draw'
      ? "It's a draw"
      : `${result.winner} wins!`
    : `${xIsNext ? 'X' : 'O'} to play`

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,69,58,0.04) 0%, rgba(191,90,242,0.04) 50%, transparent 70%)' }}
      />

      <div
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
        className="px-4 pb-2 flex-shrink-0 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex items-center justify-between mb-1"
        >
          <span className="text-[24px] font-bold tracking-tight">Play</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={resetBoard}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </motion.button>
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 gap-4">
        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...spring }}
          className="glass-pill rounded-2xl px-5 py-2 flex items-center gap-5"
        >
          <ScoreBadge player="X" score={scores.X} active={!result && xIsNext} color="#ff453a" />
          <span className="text-white/20 text-[10px] font-medium">VS</span>
          <ScoreBadge player="O" score={scores.O} active={!result && !xIsNext} color="#5ac8fa" />
        </motion.div>

        {/* Status */}
        <motion.p
          key={status}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-white/40 font-medium tracking-wide"
        >
          {result ? (
            <span style={{ color: result.winner === 'draw' ? 'rgba(255,255,255,0.5)' : ACCENT }}>
              {result.winner === 'draw' ? "It's a draw" : `${result.winner} wins!`}
            </span>
          ) : (
            <>Next: <span style={{ color: xIsNext ? '#ff453a' : '#5ac8fa' }}>{xIsNext ? 'X' : 'O'}</span></>
          )}
        </motion.p>

        {/* Board */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, ...spring }}
          className="relative"
        >
          {/* Win line */}
          {result?.line && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.3, ...spring }}
              className="absolute z-20 h-1 rounded-full pointer-events-none"
              style={{
                background: ACCENT,
                boxShadow: '0 0 12px rgba(255,69,58,0.5)',
                ...getLineStyle(result.line),
              }}
            />
          )}

          <div
            className="grid grid-cols-3 gap-2 p-3 rounded-3xl"
            style={{
              background: 'rgba(28,28,30,0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            {board.map((cell, i) => (
              <motion.button
                key={i}
                whileTap={!cell && !winnerData ? { scale: 0.92 } : {}}
                onClick={() => handleMove(i)}
                className="w-[72px] h-[72px] rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  ...(result?.line?.includes(i) ? { background: `${ACCENT}15` } : {}),
                }}
              >
                <AnimatePresence mode="wait">
                  {cell === 'X' && (
                    <motion.span
                      key={`x-${i}`}
                      initial={{ opacity: 0, scale: 0, rotate: -30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={pieceSpring}
                      className="text-[32px] font-bold select-none"
                      style={{ color: '#ff453a', textShadow: '0 0 16px rgba(255,69,58,0.3)' }}
                    >
                      X
                    </motion.span>
                  )}
                  {cell === 'O' && (
                    <motion.span
                      key={`o-${i}`}
                      initial={{ opacity: 0, scale: 0, rotate: 30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={pieceSpring}
                      className="text-[32px] font-bold select-none"
                      style={{ color: '#5ac8fa', textShadow: '0 0 16px rgba(90,200,250,0.3)' }}
                    >
                      O
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Hover glow */}
                {!cell && !winnerData && (
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
            ))}
          </div>
        </motion.div>

        {/* Result overlay actions */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, ...spring }}
            className="flex items-center gap-3"
          >
            {result.winner !== 'draw' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, ...spring }}
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
              Reset scores
            </motion.button>
          </motion.div>
        )}

        <p className="text-[10px] text-white/15 mt-2">Tap a cell to place your mark</p>
      </div>
    </div>
  )
}

function ScoreBadge({ player, score, active, color }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ scale: active ? 1.1 : 1, opacity: active ? 1 : 0.5 }}
        transition={{ duration: 0.2 }}
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
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-[15px] font-semibold tabular-nums"
        style={{ color }}
      >
        {score}
      </motion.span>
    </div>
  )
}

function getLineStyle(line) {
  const positions = [
    [0,0],[0,1],[0,2],
    [1,0],[1,1],[1,2],
    [2,0],[2,1],[2,2],
  ]
  const idxs = line.map(i => positions[i])
  const minRow = Math.min(...idxs.map(p => p[0]))
  const maxRow = Math.max(...idxs.map(p => p[0]))
  const minCol = Math.min(...idxs.map(p => p[1]))
  const maxCol = Math.max(...idxs.map(p => p[1]))

  const cellW = 72 + 8
  const gap = 12
  const pad = 12

  const centerX = pad + (minCol + maxCol + 1) * cellW / 2
  const centerY = pad + (minRow + maxRow + 1) * cellW / 2

  // horizontal
  if (minRow === maxRow) {
    const y = pad + minRow * cellW + cellW / 2
    return { top: y - 2, left: pad + minCol * cellW + 4, width: (maxCol - minCol + 1) * cellW - 8, transformOrigin: 'left' }
  }
  // vertical
  if (minCol === maxCol) {
    const x = pad + minCol * cellW + cellW / 2
    return { top: pad + minRow * cellW + 4, left: x - 60, width: 120, transformOrigin: 'left', transform: 'rotate(90deg) translateX(-50%)' }
  }
  // diagonal
  const diagLen = Math.sqrt(2) * 2 * cellW
  if (line[0] === 0 && line[1] === 4 && line[2] === 8) {
    const cx = pad + cellW * 1.5
    const cy = pad + cellW * 1.5
    return { top: cy - 2, left: cx - 8, width: diagLen - 16, transformOrigin: 'left', transform: 'rotate(45deg) translateY(-50%)' }
  }
  return { top: centerY, left: centerX, width: 40, height: 4 }
}
