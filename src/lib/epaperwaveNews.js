const API_BASE = 'https://epaperwave.com/wp-json/wp/v2'
const CACHE_KEY = 'epaperwave-cache-v1'

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') }
  catch { return {} }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }))
  } catch { /* quota */ }
}

export function getCachedNewsAge() {
  const cache = readCache()
  return cache.savedAt || null
}

/** Fetch English newspaper posts from epaperwave WordPress REST API */
export async function fetchEpaperwaveNews() {
  const attempts = [
    // Direct API
    async () => {
      const posts = await fetchJson(`${API_BASE}/posts?categories=6&per_page=100&_fields=id,title,link,excerpt,featured_media,date`)
      // Fetch featured media URLs in parallel (batch of 6)
      const withImages = await Promise.all(posts.slice(0, 18).map(async (post) => {
        if (!post.featured_media) return { ...post, image: null }
        try {
          const media = await fetchJson(`${API_BASE}/media/${post.featured_media}`)
          return { ...post, image: media.source_url || null }
        } catch {
          return { ...post, image: null }
        }
      }))
      return withImages
    },
    // CORS proxy fallback
    async () => {
      const url = `${API_BASE}/posts?categories=6&per_page=20&_fields=id,title,link,excerpt,featured_media,date`
      const mirrors = [
        u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      ]
      for (const wrap of mirrors) {
        try {
          const posts = await fetchJson(wrap(url))
          return posts.map(p => ({ ...p, image: null }))
        } catch { /* next */ }
      }
      throw new Error('mirrors failed')
    },
  ]

  for (const attempt of attempts) {
    try {
      const articles = await attempt()
      if (articles?.length) {
        writeCache(articles)
        return articles
      }
    } catch { /* next */ }
  }

  const cached = readCache()
  if (cached.savedAt) {
    const { savedAt, ...items } = cached
    const list = Object.values(items)
    if (list.length) return list.flat()
  }
  throw new Error('Could not load news')
}

/** Fetch full post content for the quick-read view */
export async function fetchPostContent(postId) {
  try {
    const post = await fetchJson(`${API_BASE}/posts/${postId}?_fields=id,title,content,date,link`)
    return post
  } catch {
    // Fallback: try fetching the page directly
    try {
      const post = await fetchJson(`${API_BASE}/posts/${postId}?_fields=id,title,content,date,link`)
      return post
    } catch {
      return null
    }
  }
}

/** Strip HTML tags and truncate for summary */
export function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Estimate reading time in minutes (250 wpm) */
export function readingTime(text) {
  const words = text.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 250))
}

/** Generate a quick-read summary from post content */
export function summarizeContent(content) {
  const text = stripHtml(content)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  // Take first 10-12 substantial sentences for a ~3 minute read
  const summary = sentences.slice(0, 12).join('. ') + '.'
  return summary || text.slice(0, 1500)
}
