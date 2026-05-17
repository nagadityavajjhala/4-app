import React from 'react'
import { Sparkles } from 'lucide-react'
import { getDailyPrompt } from '../../lib/dailyPrompts'
import { ACCENT, ACCENT_SOFT } from '../../lib/accent'

export default function DailyPromptBanner({ onUse }) {
  const prompt = getDailyPrompt()

  return (
    <button
      type="button"
      onClick={() => onUse?.(prompt)}
      className="mx-4 mb-3 w-[calc(100%-2rem)] text-left rounded-2xl p-4 transition-colors active:opacity-90"
      style={{
        background: ACCENT_SOFT,
        border: `1px solid rgba(${ACCENT.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(', ') || '255,69,58'}, 0.25)`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={14} style={{ color: ACCENT }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
          Daily prompt
        </span>
      </div>
      <p className="text-[14px] text-white/85 leading-snug">{prompt}</p>
      <p className="text-[11px] text-white/35 mt-1.5">Tap to share in a chat</p>
    </button>
  )
}
