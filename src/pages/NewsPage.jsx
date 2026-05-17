import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Clock, ExternalLink, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ACCENT, ACCENT_SOFT } from '../lib/accent'
import { fetchBBCNews, BBC_CATEGORIES, getCachedNewsAge } from '../lib/bbcNews'

const spring = { type: 'spring', stiffness: 260, damping: 24, mass: 0.8 }

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
      setError('Could not load BBC News. Pull to refresh when you have connection.')
      setArticles([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [category])

  useEffect(() => { fetchNews(category) }, [category, fetchNews])

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* ── Header ── */}
      <div
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
        className="px-5 pb-3 flex-shrink-0"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex items-center justify-between mb-4"
        >
          <span className="section-title">News</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => fetchNews(category, true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={16} strokeWidth={1.8} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {BBC_CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.04, ...spring }}
              onClick={() => setCategory(cat)}
              whileTap={{ scale: 0.92 }}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 select-none"
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

      <div className="px-5 mb-2 flex-shrink-0">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[11px] text-white/25"
        >
          {error || (fromCache ? 'Cached BBC News (offline) · Tap to read' : 'Live from BBC News · Tap any story')}
        </motion.span>
      </div>

      {/* ── Bento Grid ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorState onRetry={() => fetchNews(category, true)} />
        ) : (
          <BentoGrid articles={articles} onOpen={(a) => setSelected(a)} />
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

// ── Bento Grid ───────────────────────────────────────────────
function BentoGrid({ articles, onOpen }) {
  const [first, second, third, ...rest] = articles

  return (
    <div className="flex flex-col gap-3">
      {/* Hero card — full width */}
      {first && <HeroCard article={first} onOpen={onOpen} />}

      {/* Second row — 2 columns: second large, third small */}
      {(second || third) && (
        <div className="flex gap-3">
          {second && (
            <div className="flex-1 min-w-0">
              <LargeCard article={second} onOpen={onOpen} />
            </div>
          )}
          {third && (
            <div className="w-[120px] flex-shrink-0">
              <SmallCard article={third} onOpen={onOpen} />
            </div>
          )}
        </div>
      )}

      {/* Remaining — 2-column grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.map((article, i) => (
            <GridCard key={article.url + i} article={article} index={i} onOpen={onOpen} />
          ))}
        </div>
      )}

      {articles.length === 0 && (
        <p className="text-center text-white/30 text-[13px] pt-12">
          No stories right now
        </p>
      )}
    </div>
  )
}

function timeAgo(dateStr) {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }) }
  catch { return '' }
}

// ── Hero Card ───────────────────────────────────────────────
function HeroCard({ article, onOpen }) {
  const ts = article.publishedAt ? timeAgo(article.publishedAt) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, stiffness: 200 }}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      onClick={() => onOpen(article)}
      className="w-full rounded-3xl overflow-hidden text-left relative"
      style={{ background: 'rgba(44,44,46,0.6)', aspectRatio: '16/9' }}
    >
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
            BBC
          </span>
          {ts && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                <Clock size={9} />
                {ts}
              </span>
            </>
          )}
        </div>
        <h3 className="font-bold text-[16px] leading-tight text-white line-clamp-2">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-[12px] text-white/50 line-clamp-1 mt-1">
            {article.description}
          </p>
        )}
      </div>
    </motion.button>
  )
}

// ── Large Card (flexible) ────────────────────────────────────
function LargeCard({ article, onOpen }) {
  const ts = article.publishedAt ? timeAgo(article.publishedAt) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onOpen(article)}
      className="w-full rounded-2xl overflow-hidden text-left relative"
      style={{ background: 'rgba(44,44,46,0.5)', aspectRatio: '4/5' }}
    >
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
          BBC
        </span>
        {ts && (
          <span className="text-[9px] text-white/40 ml-1.5">{ts}</span>
        )}
        <h3 className="font-semibold text-[13px] leading-tight text-white mt-1 line-clamp-3">
          {article.title}
        </h3>
      </div>
    </motion.button>
  )
}

// ── Small Card ──────────────────────────────────────────────
function SmallCard({ article, onOpen }) {
  const ts = article.publishedAt ? timeAgo(article.publishedAt) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onOpen(article)}
      className="w-full rounded-2xl overflow-hidden text-left relative"
      style={{ background: 'rgba(44,44,46,0.5)', aspectRatio: '3/5' }}
    >
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
          BBC
        </span>
        <h3 className="font-semibold text-[11px] leading-tight text-white mt-0.5 line-clamp-3">
          {article.title}
        </h3>
      </div>
    </motion.button>
  )
}

// ── Grid Card (2-col grid) ──────────────────────────────────
function GridCard({ article, index, onOpen }) {
  const ts = article.publishedAt ? timeAgo(article.publishedAt) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.15 + index * 0.03, 0.4), ...spring }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onOpen(article)}
      className="rounded-2xl overflow-hidden text-left relative"
      style={{ background: 'rgba(44,44,46,0.5)', aspectRatio: '1/1.2' }}
    >
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
            BBC
          </span>
          {ts && (
            <span className="text-[8px] text-white/35">{ts}</span>
          )}
        </div>
        <h3 className="font-semibold text-[11px] leading-snug text-white mt-0.5 line-clamp-3">
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
          whileHover={{ scale: 1.05 }}
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

// ── Skeleton ────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-full rounded-3xl skeleton" style={{ aspectRatio: '16/9' }} />
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl skeleton" style={{ aspectRatio: '4/5' }} />
        <div className="w-[120px] rounded-2xl skeleton" style={{ aspectRatio: '3/5' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl skeleton" style={{ aspectRatio: '1/1.2' }} />
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
      className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center"
    >
      <p className="text-white/40 text-[14px]">Could not load BBC News. Pull to refresh when you have connection.</p>
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
