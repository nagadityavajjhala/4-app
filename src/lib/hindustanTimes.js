const CACHE_KEY = 'toi-news-cache-v2'

const FEEDS = {
  Top: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
  India: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
  World: 'https://indianexpress.com/section/world/feed/',
  Tech: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms',
  Sports: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
  Business: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms',
  Entertainment: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms',
  Science: 'https://timesofindia.indiatimes.com/rssfeeds/-2128672765.cms',
}

const SOURCES = {
  'https://timesofindia.indiatimes.com/': 'Times of India',
  'https://indianexpress.com/': 'Indian Express',
}

export const NEWS_TOPICS = Object.keys(FEEDS)

function detectSource(url) {
  for (const [prefix, name] of Object.entries(SOURCES)) {
    if (url.startsWith(prefix)) return name
  }
  return 'News'
}

function parseRss(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  const items = [...doc.querySelectorAll('item')]
  return items.slice(0, 30).map((item, i) => {
    const title = item.querySelector('title')?.textContent?.trim() || ''
    const link = item.querySelector('link')?.textContent?.trim() || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''
    const desc = item.querySelector('description')?.textContent || ''
    const media = item.querySelector('media\\:content, content')
    const imgSrc = media?.getAttribute('url')
      || item.querySelector('enclosure')?.getAttribute('url')
      || (desc?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, '&'))
      || null
    const cleanDesc = (desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const summaryText = cleanDesc.length > 300 ? cleanDesc.slice(0, 300) + '…' : cleanDesc
    return {
      id: i,
      title,
      link,
      source: detectSource(link),
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
  return readCache(category)?.savedAt || null
}

export async function fetchHindustanTimes(category = 'Top') {
  const feedUrl = FEEDS[category] || FEEDS.Top

  const attempts = [
    // rss2json — handles CORS, returns JSON
    async () => {
      const json = await fetchText(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`)
      const data = JSON.parse(json)
      if (data.status !== 'ok' || !data.items?.length) throw new Error('no items')
      const source = detectSource(feedUrl)
      return data.items.slice(0, 30).map((item, i) => {
        const cleanDesc = (item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const summaryText = cleanDesc.length > 300 ? cleanDesc.slice(0, 300) + '…' : cleanDesc
        return {
          id: i,
          title: item.title || '',
          link: item.link || '',
          source,
          publishedAt: item.pubDate || '',
          description: summaryText,
          image: item.thumbnail || item.enclosure?.link || null,
          contentSnippet: summaryText,
        }
      }).filter(a => a.title && a.link)
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
    } catch (e) { /* next */ }
  }

  const cached = readCache(category)
  if (cached?.articles?.length) return cached.articles
  throw new Error('Could not load news')
}
