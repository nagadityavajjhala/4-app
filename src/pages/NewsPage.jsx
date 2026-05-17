import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Clock, ExternalLink, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fetchBBCNews, BBC_CATEGORIES, getCachedNewsAge } from '../lib/bbcNews'

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
      <div
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
        className="px-5 pb-3"
      >
        <motion.div className="flex items-center justify-between mb-4">
          <span className="section-title">News</span>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => fetchNews(category, true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={16} strokeWidth={1.8} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {BBC_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200"
              style={{
                background: category === cat ? '#fff' : 'rgba(255,255,255,0.08)',
                color: category === cat ? '#000' : 'rgba(255,255,255,0.5)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mb-2">
        <span className="text-[11px] text-white/25">
          {error || (fromCache ? 'Cached BBC News (offline) · Tap to read' : 'Live from BBC News · Tap any story to read')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="space-y-5 pt-2">
            {[80, 65, 75, 55].map((w, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-[14px] skeleton rounded-full" style={{ width: `${w}%` }} />
                  <div className="h-[14px] skeleton rounded-full w-full" />
                  <div className="h-[11px] skeleton rounded-full w-3/4" />
                </div>
                <div className="w-20 h-20 rounded-2xl skeleton flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
            <p className="text-white/40 text-[14px]">{error}</p>
            <button
              onClick={() => fetchNews(category, true)}
              className="px-5 py-2.5 rounded-full text-[13px] font-medium"
              style={{ background: 'rgba(255,69,58,0.2)', color: '#ff453a' }}
            >
              Try again
            </button>
          </div>
        ) : (
          <div>
            {articles.map((article, i) => (
              <ArticleRow
                key={article.url + i}
                article={article}
                index={i}
                onOpen={() => setSelected(article)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <ArticleReader article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function ArticleRow({ article, index, onOpen }) {
  const ts = article.publishedAt
    ? (() => {
        try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) }
        catch { return '' }
      })()
    : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      onClick={onOpen}
      className="w-full flex gap-3 py-4 border-b text-left active:opacity-70 transition-opacity"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-semibold text-accent-blue uppercase tracking-wide">
            BBC
          </span>
          {ts && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="flex items-center gap-0.5 text-[10px] text-white/30">
                <Clock size={9} />
                {ts}
              </span>
            </>
          )}
        </div>
        <h3 className="font-semibold text-[14px] leading-snug text-white/90 line-clamp-3 mb-1">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-[12px] text-white/35 line-clamp-2 leading-relaxed">
            {article.description}
          </p>
        )}
      </div>
      {article.image && (
        <div
          className="w-[80px] h-[80px] rounded-2xl overflow-hidden flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => { e.target.parentElement.style.display = 'none' }}
          />
        </div>
      )}
    </motion.button>
  )
}

function ArticleReader({ article, onClose }) {
  const ts = article.publishedAt
    ? (() => {
        try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) }
        catch { return '' }
      })()
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.95)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <ChevronLeft size={20} />
        </motion.button>
        <span className="font-semibold text-[15px] flex-1">BBC News</span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a' }}
        >
          <ExternalLink size={16} />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto">
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
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl text-[14px] font-semibold"
            style={{ background: '#ff453a', color: '#fff' }}
          >
            Read full story on BBC
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  )
}
