import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ChevronLeft, Clock, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ACCENT, ACCENT_SOFT } from '../lib/accent'
import { fetchHindustanTimes, NEWS_TOPICS, getCachedNewsAge } from '../lib/hindustanTimes'

const spring = { type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }

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
      const items = await fetchHindustanTimes(cat)
      setArticles(items)
      const after = getCachedNewsAge(cat)
      setFromCache(before && after === before)
    } catch (err) {
      console.error('News fetch:', err)
      setError('Could not load news.')
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className="flex items-center justify-between mb-2"
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
          transition={{ delay: 0.05 }}
          className="flex gap-1.5 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {NEWS_TOPICS.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 + i * 0.025, duration: 0.12 }}
              onClick={() => setCategory(cat)}
              whileTap={{ scale: 0.92 }}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors duration-150 select-none"
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
          <BentoGrid articles={articles} onOpen={(a) => setSelected(a)} />
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

function BentoGrid({ articles, onOpen }) {
  if (articles.length === 0) {
    return <p className="text-center text-white/30 text-[13px] pt-12">No news right now</p>
  }

  const items = articles.slice(0, 24)
  const [first, second, third, fourth, fifth, ...rest] = items

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-2.5" style={{ gridAutoRows: 'auto' }}>
        {first && (
          <BentoCard article={first} className="col-span-4 xs:col-span-2" aspect="16/9" index={0} onOpen={onOpen} label />
        )}
        {second && (
          <BentoCard article={second} className="col-span-2 xs:col-span-1" aspect="1/1" index={1} onOpen={onOpen} />
        )}
        {third && (
          <BentoCard article={third} className="col-span-2 xs:col-span-1" aspect="1/1" index={2} onOpen={onOpen} />
        )}
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {fourth && (
          <BentoCard article={fourth} className="col-span-2" aspect="4/3" index={3} onOpen={onOpen} />
        )}
        {fifth && (
          <BentoCard article={fifth} className="col-span-2" aspect="4/3" index={4} onOpen={onOpen} />
        )}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {rest.map((article, i) => (
            <BentoCard key={article.id || i} article={article} className="col-span-1" aspect="1/1.1" index={i + 5} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgo(dateStr) {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }) }
  catch { return '' }
}

function BentoCard({ article, className, aspect, index, onOpen, label }) {
  const ts = article.publishedAt ? timeAgo(article.publishedAt) : null
  const sizeClass = !label ? 'text-[10.5px] font-semibold p-2 leading-tight line-clamp-3' : 'font-bold text-[13px] p-3 leading-tight line-clamp-3'
  const tsClass = label ? 'text-[9px] text-white/35 mt-1' : 'text-[7px] text-white/30 mt-0.5'

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(0.02 * index, 0.25), duration: 0.12 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onOpen(article)}
      className={`min-w-0 rounded-2xl overflow-hidden text-left relative ${className}`}
      style={{ background: 'rgba(44,44,46,0.5)', aspectRatio: aspect }}
    >
      {article.image && (
        <img src={article.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0">
        {label && (
          <div className="px-3 pt-1">
            <span className="text-[8px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
              {article.source || 'News'}
            </span>
          </div>
        )}
        <h3 className={`text-white ${label ? 'font-bold text-[13px] p-3 pt-0.5 leading-tight line-clamp-3' : 'font-semibold text-[10.5px] p-2 leading-tight line-clamp-3'}`}>
          {article.title?.replace(/^[^:]+:\s*/, '')}
        </h3>
        {ts && <p className={`${label ? 'px-3 pb-[10px] text-[9px] text-white/30' : 'px-2 pb-1.5 text-[7px] text-white/30'}`}>{ts}</p>}
      </div>
    </motion.button>
  )
}

// ── Quick Reader ─────────────────────────────────────────────
function QuickReader({ article, onClose }) {
  const ts = article.publishedAt
    ? (() => { try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) } catch { return '' } })()
    : null

  const text = article.contentSnippet || article.description || ''
  const wordCount = text.split(/\s+/).length
  const readMins = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <motion.div
      initial={{ opacity: 0, y: '6%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '4%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
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
        <span className="font-semibold text-[15px] flex-1">
          {article.source || 'News'}
        </span>
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.06 }}
        className="flex-1 overflow-y-auto px-5 py-5"
      >
        {article.image && (
          <img src={article.image} alt="" className="w-full rounded-2xl mb-4 object-cover" style={{ maxHeight: 200 }} />
        )}

        <h1 className="text-[20px] font-bold leading-tight text-white mb-2">
          {article.title}
        </h1>

        <div className="flex items-center gap-2 mb-4 text-[11px] text-white/30">
          {ts && <span>{ts}</span>}
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            ~{readMins} min read
          </span>
        </div>

        <div
          className="text-[14.5px] text-white/75 leading-relaxed"
          style={{ lineHeight: 1.8 }}
        >
          {article.contentSnippet || article.description || 'No summary available.'}
        </div>

        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <motion.a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-semibold"
            style={{ background: ACCENT, color: '#fff' }}
          >
            Read full article
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
      <div className="grid grid-cols-4 gap-2.5">
        <div className="col-span-2 rounded-2xl skeleton" style={{ aspectRatio: '16/9' }} />
        <div className="col-span-1 rounded-2xl skeleton" style={{ aspectRatio: '1/1' }} />
        <div className="col-span-1 rounded-2xl skeleton" style={{ aspectRatio: '1/1' }} />
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        <div className="col-span-2 rounded-2xl skeleton" style={{ aspectRatio: '4/3' }} />
        <div className="col-span-2 rounded-2xl skeleton" style={{ aspectRatio: '4/3' }} />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl skeleton" style={{ aspectRatio: '1/1.1' }} />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
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
