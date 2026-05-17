const CACHE_KEY = 'ht-news-cache-v1'

const FEEDS = {
  Top: 'https://www.hindustantimes.com/feeds/rss/topnews/rssfeed.xml',
  India: 'https://www.hindustantimes.com/feeds/rss/india/feed.xml',
  World: 'https://www.hindustantimes.com/feeds/rss/world/feed.xml',
  Tech: 'https://www.hindustantimes.com/feeds/rss/technology/feed.xml',
  Science: 'https://www.hindustantimes.com/feeds/rss/science/feed.xml',
  Sports: 'https://www.hindustantimes.com/feeds/rss/sports/feed.xml',
  Business: 'https://www.hindustantimes.com/feeds/rss/business/feed.xml',
  Entertainment: 'https://www.hindustantimes.com/feeds/rss/entertainment/feed.xml',
}

export const NEWS_TOPICS = Object.keys(FEEDS)

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
      || (desc.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, '&'))
      || null
    const cleanDesc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const summaryText = cleanDesc.length > 300 ? cleanDesc.slice(0, 300) + '…' : cleanDesc
    return {
      id: i,
      title,
      link,
      source: 'Hindustan Times',
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
    async () => {
      const xml = await fetchText(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`)
      return parseRss(xml)
    },
    async () => {
      const xml = await fetchText(`https://corsproxy.io/?${encodeURIComponent(feedUrl)}`)
      return parseRss(xml)
    },
    async () => {
      const xml = await fetchText(feedUrl)
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
