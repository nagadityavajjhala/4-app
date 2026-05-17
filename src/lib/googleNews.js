const CACHE_KEY = 'google-news-cache-v1'

const TOPICS = {
  Top: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  World: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
  Tech: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
  Science: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
  Health: 'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en',
  Sports: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
  Business: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  Entertainment: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
}

export const NEWS_TOPICS = Object.keys(TOPICS)

/** Parse RSS XML text into article objects */
function parseRss(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  const items = [...doc.querySelectorAll('item')]
  return items.slice(0, 30).map((item, i) => {
    const title = item.querySelector('title')?.textContent?.trim() || ''
    const link = item.querySelector('link')?.textContent?.trim() || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''
    const source = item.querySelector('source')?.textContent || 'Google News'
    const desc = item.querySelector('description')?.textContent || ''

    // Extract image from description HTML
    const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i)
    const imgSrc = imgMatch?.[1]
      ?.replace(/&amp;/g, '&')
      ?.replace(/&lt;/g, '<')
      ?.replace(/&gt;/g, '>')
      ?.replace(/&quot;/g, '"')
      // Google News images may need size param removed
      ?.replace(/=w\d+-h\d+-p/, '=w400-h200-p')
      || null

    // Clean description (strip HTML)
    const cleanDesc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const summaryText = cleanDesc.length > 300 ? cleanDesc.slice(0, 300) + '…' : cleanDesc

    return {
      id: i,
      title,
      link,
      source,
      publishedAt: pubDate,
      description: summaryText,
      image: imgSrc,
      contentSnippet: summaryText,
    }
  }).filter(a => a.title && a.link)
}

async function fetchText(url, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function readCache(category) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    return all[category] || null
  } catch { return null }
}

function writeCache(category, articles) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    all[category] = { articles, savedAt: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch { /* quota */ }
}

export function getCachedNewsAge(category) {
  const cached = readCache(category)
  return cached?.savedAt || null
}

/** Fetch news from Google News RSS via CORS proxy */
export async function fetchGoogleNews(category = 'Top') {
  const feedUrl = TOPICS[category] || TOPICS.Top

  const attempts = [
    // Direct Google RSS (unlikely to work due to CORS, but try)
    async () => {
      const xml = await fetchText(feedUrl)
      return parseRss(xml)
    },
    // allorigins proxy
    async () => {
      const xml = await fetchText(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`)
      return parseRss(xml)
    },
    // corsproxy.io fallback
    async () => {
      const xml = await fetchText(`https://corsproxy.io/?${encodeURIComponent(feedUrl)}`)
      return parseRss(xml)
    },
  ]

  for (const attempt of attempts) {
    try {
      const articles = await attempt()
      if (articles?.length) {
        writeCache(category, articles)
        return articles
      }
    } catch { /* next */ }
  }

  const cached = readCache(category)
  if (cached?.articles?.length) return cached.articles
  throw new Error('Could not load news')
}
