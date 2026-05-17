import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ChevronLeft, Clock, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ACCENT, ACCENT_SOFT } from '../lib/accent'
import { fetchEpaperwaveNews, fetchPostContent, stripHtml, summarizeContent, readingTime, getCachedNewsAge } from '../lib/epaperwaveNews'

const spring = { type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }

export default function NewsPage() {
  const [articles, setArticles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [fromCache, setFromCache]   = useState(false)

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    setFromCache(false)
    const before = getCachedNewsAge()
    try {
      const items = await fetchEpaperwaveNews()
      setArticles(items)
      const after = getCachedNewsAge()
      setFromCache(before && after === before)
    } catch (err) {
      console.error('News fetch:', err)
      setError('Could not load news.')
      setArticles([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchNews() }, [fetchNews])

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
        className="px-4 pb-2 flex-shrink-0"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-between mb-2"
        >
          <span className="text-[24px] font-bold tracking-tight">News</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => fetchNews(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={14} strokeWidth={1.8} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>
        </motion.div>

        {!error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-[10px] text-white/20"
          >
            {fromCache ? 'Cached · ' : ''}Tap to read summary
          </motion.p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-5">
        {loading ? (
          <CompactSkeleton />
        ) : error ? (
          <ErrorState onRetry={() => fetchNews(true)} />
        ) : (
          <CompactBentoGrid articles={articles} onOpen={(a) => setSelected(a)} />
        )}
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <QuickReader article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function CompactBentoGrid({ articles, onOpen }) {
  if (articles.length === 0) {
    return <p className="text-center text-white/30 text-[13px] pt-12">No news right now</p>
  }

  const chunks = []
  for (let i = 0; i < Math.min(articles.length, 15); i += 3) {
    chunks.push(articles.slice(i, i + 3))
  }

  return (
    <div className="flex flex-col gap-2.5">
      {chunks.map((row, ri) => (
        <motion.div
          key={ri}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: ri * 0.04, duration: 0.15 }}
          className="flex gap-2.5"
        >
          {row.map((article, ci) => (
            <CompactCard
              key={article.id || ci}
              article={article}
              index={ri * 3 + ci}
              onOpen={onOpen}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}

function timeAgo(dateStr) {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }) }
  catch { return '' }
}

function CompactCard({ article, index, onOpen }) {
  const title = article.title?.rendered || article.title || ''
  const excerpt = article.excerpt?.rendered || ''
  const ts = article.date ? timeAgo(article.date) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.03 * index, 0.25), duration: 0.2 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onOpen(article)}
      className="flex-1 min-w-0 rounded-2xl overflow-hidden text-left relative"
      style={{
        background: 'rgba(44,44,46,0.5)',
        aspectRatio: '1/1.1',
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
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[7px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            epaper
          </span>
          {ts && (
            <span className="text-[7px] text-white/35 ml-auto">{ts}</span>
          )}
        </div>
        <h3
          className="font-semibold text-white leading-tight line-clamp-2"
          style={{ fontSize: 11, lineHeight: 1.3 }}
        >
          {stripHtml(title)}
        </h3>
      </div>
    </motion.button>
  )
}

// ── Quick Reader (~3 min read) ──────────────────────────────
function QuickReader({ article, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const post = await fetchPostContent(article.id)
      if (!cancelled) {
        setContent(post)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [article.id])

  const title = stripHtml(article.title?.rendered || article.title || '')
  const ts = article.date
    ? (() => { try { return formatDistanceToNow(new Date(article.date), { addSuffix: true }) } catch { return '' } })()
    : null

  const summary = content ? summarizeContent(content.content?.rendered || '') : ''
  const readMins = content ? readingTime(summary) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: '6%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '4%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Header */}
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
        <span className="font-semibold text-[15px] flex-1">Quick Read</span>
        <motion.a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.85 }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: ACCENT_SOFT, color: ACCENT }}
        >
          <ExternalLink size={16} />
        </motion.a>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="flex-1 overflow-y-auto px-5 py-5"
      >
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="w-full rounded-2xl mb-5 object-cover"
            style={{ maxHeight: 200 }}
          />
        )}

        <h1 className="text-[20px] font-bold leading-tight text-white mb-2">
          {title}
        </h1>

        <div className="flex items-center gap-2 mb-5 text-[11px] text-white/30">
          {ts && <span>{ts}</span>}
          {readMins > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {readMins} min read
              </span>
            </>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton rounded-lg h-4" style={{ width: `${60 + i * 8}%` }} />
            ))}
          </div>
        ) : (
          <div
            className="text-[14px] text-white/75 leading-relaxed"
            style={{ lineHeight: 1.7 }}
          >
            {summary}
          </div>
        )}

        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <motion.a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-semibold"
            style={{ background: ACCENT, color: '#fff' }}
          >
            Read full on epaperwave
            <ExternalLink size={13} />
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
            <div key={c} className="flex-1 rounded-2xl skeleton" style={{ aspectRatio: '1/1.1' }} />
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
      transition={{ duration: 0.15 }}
      className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center"
    >
      <p className="text-white/40 text-[14px]">Could not load news.</p>
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
