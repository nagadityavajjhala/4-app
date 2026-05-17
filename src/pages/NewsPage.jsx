import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Clock, ExternalLink, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ACCENT, ACCENT_SOFT } from '../lib/accent'
import { fetchBBCNews, BBC_CATEGORIES, getCachedNewsAge } from '../lib/bbcNews'

const spring = { type: 'spring', stiffness: 300, damping: 26, mass: 0.7 }

export default function NewsPage() {
  const [articles, setArticles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [category, setCategory]     = useState('Top')
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [fromCache, setFromCache]   = useState(false)

  const fetchNews = useCallback(async (cat = category, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    setFromCache(false)
    const before = getCachedNewsAge(cat)
    try {
      const items = await fetchBBCNews(cat)
      setArticles(items.slice(0, 40))
      const after = getCachedNewsAge(cat)
      setFromCache(before && after === before)
    } catch (err) {
      console.error('News fetch:', err)
      setError('Could not load BBC News.')
      setArticles([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [category])

  useEffect(() => { fetchNews(category) }, [category, fetchNews])

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
        className="px-4 pb-2 flex-shrink-0"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex items-center justify-between mb-3"
        >
          <span className="text-[24px] font-bold tracking-tight">News</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => fetchNews(category, true)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={14} strokeWidth={1.8} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1.5 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {BBC_CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.03, ...spring }}
              onClick={() => setCategory(cat)}
              whileTap={{ scale: 0.92 }}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors duration-200 select-none"
              style={{
                background: category === cat ? '#fff' : 'rgba(255,255,255,0.08)',
                color: category === cat ? '#000' : 'rgba(255,255,255,0.5)',
              }}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-5">
        {loading ? (
          <CompactSkeleton />
        ) : error ? (
          <ErrorState onRetry={() => fetchNews(category, true)} />
        ) : (
          <CompactBentoGrid articles={articles} onOpen={(a) => setSelected(a)} />
        )}
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <ArticleReader article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Compact Bento Grid ───────────────────────────────────────
function CompactBentoGrid({ articles, onOpen }) {
  if (articles.length === 0) {
    return <p className="text-center text-white/30 text-[13px] pt-12">No stories right now</p>
  }

  // Take first 12 articles max, chunk into rows of 3
  const chunks = []
  for (let i = 0; i < Math.min(articles.length, 12); i += 3) {
    chunks.push(articles.slice(i, i + 3))
  }

  return (
    <div className="flex flex-col gap-2.5">
      {chunks.map((row, ri) => (
        <motion.div
          key={ri}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ri * 0.06, ...spring }}
          className="flex gap-2.5"
        >
          {row.map((article, ci) => {
            const isFirst = ri === 0 && ci === 0
            return (
              <CompactCard
                key={article.url + ci}
                article={article}
                index={ri * 3 + ci}
                isHero={isFirst}
                onOpen={onOpen}
              />
            )
          })}
        </motion.div>
      ))}
    </div>
  )
}

function timeAgo(dateStr) {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }) }
  catch { return '' }
}

// ── Compact Card ─────────────────────────────────────────────
function CompactCard({ article, index, isHero, onOpen }) {
  const ts = article.publishedAt ? timeAgo(article.publishedAt) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.04 * index, 0.35), ...spring }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onOpen(article)}
      className="flex-1 min-w-0 rounded-2xl overflow-hidden text-left relative"
      style={{
        background: 'rgba(44,44,46,0.5)',
        aspectRatio: isHero ? '16/10' : '1/1.15',
      }}
    >
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', imageRendering: 'auto' }}
          loading="lazy"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: isHero
            ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 45%, transparent 70%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[7px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            BBC
          </span>
          {ts && (
            <span className="text-[7px] text-white/35 ml-auto">{ts}</span>
          )}
        </div>
        <h3
          className="font-semibold text-white leading-tight"
          style={{ fontSize: isHero ? 14 : 11, lineHeight: 1.3 }}
        >
          {article.title}
        </h3>
      </div>
    </motion.button>
  )
}

// ── Article Reader ──────────────────────────────────────────
function ArticleReader({ article, onClose }) {
  const ts = article.publishedAt
    ? (() => {
        try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) }
        catch { return '' }
      })()
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: '8%', scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: '5%', scale: 0.97 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.9 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'saturate(180%) blur(30px)',
          WebkitBackdropFilter: 'saturate(180%) blur(30px)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <ChevronLeft size={20} />
        </motion.button>
        <span className="font-semibold text-[15px] flex-1">BBC News</span>
        <motion.a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.85 }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: ACCENT_SOFT, color: ACCENT }}
        >
          <ExternalLink size={16} />
        </motion.a>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex-1 overflow-y-auto"
      >
        {article.image && (
          <div className="w-full aspect-[16/9] bg-white/5">
            <img src={article.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="px-5 py-5">
          {ts && <p className="text-[12px] text-white/35 mb-2">{ts}</p>}
          <h1 className="text-[22px] font-bold leading-tight text-white mb-4">
            {article.title}
          </h1>
          <p className="text-[15px] text-white/70 leading-relaxed whitespace-pre-wrap">
            {article.fullDescription || article.description}
          </p>
          <motion.a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl text-[14px] font-semibold"
            style={{ background: ACCENT, color: '#fff' }}
          >
            Read full story on BBC
            <ExternalLink size={14} />
          </motion.a>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CompactSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {[1, 2, 3].map(r => (
        <div key={r} className="flex gap-2.5">
          {[1, 2, 3].map(c => (
            <div key={c} className="flex-1 rounded-2xl skeleton" style={{ aspectRatio: '1/1.15' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center"
    >
      <p className="text-white/40 text-[14px]">Could not load BBC News.</p>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onRetry}
        className="px-5 py-2.5 rounded-full text-[13px] font-medium"
        style={{ background: ACCENT_SOFT, color: ACCENT }}
      >
        Try again
      </motion.button>
    </motion.div>
  )
}
