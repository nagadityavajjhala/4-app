const BBC_FEEDS = {
  Top: 'https://feeds.bbci.co.uk/news/rss.xml',
  World: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  Tech: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
  Science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  Health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
  Sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
}

export const BBC_CATEGORIES = Object.keys(BBC_FEEDS)
const CACHE_KEY = 'bbc-news-cache-v1'

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractImage(item) {
  const media = item.querySelector('media\\:thumbnail, thumbnail')
  if (media?.getAttribute('url')) return media.getAttribute('url')
  const desc = item.querySelector('description')?.textContent || ''
  const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i)
  return imgMatch?.[1] || null
}

export function parseRssXml(xmlText, sourceName = 'BBC News') {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
  if (doc.querySelector('parsererror')) throw new Error('Invalid RSS')

  const channelTitle = doc.querySelector('channel > title')?.textContent || sourceName
  const items = [...doc.querySelectorAll('item')]

  return items.map(item => {
    const title = item.querySelector('title')?.textContent?.trim() || ''
    const rawDesc = item.querySelector('description')?.textContent || ''
    const link =
      item.querySelector('link')?.textContent?.trim() ||
      item.querySelector('guid')?.textContent?.trim() ||
      ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''

    return {
      title,
      description: stripHtml(rawDesc).slice(0, 400),
      fullDescription: stripHtml(rawDesc),
      url: link,
      image: extractImage(item),
      publishedAt: pubDate,
      source: { name: channelTitle.includes('BBC') ? channelTitle : 'BBC News' },
    }
  }).filter(a => a.title && a.url)
}

function readCache(category) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    return all[category] || null
  } catch {
    return null
  }
}

function writeCache(category, articles) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    all[category] = { articles, savedAt: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch { /* quota */ }
}

async function fetchText(url, timeoutMs = 12000) {
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

/** Load BBC RSS with mirrors + offline cache (no YouTube or extra APIs). */
export async function fetchBBCNews(category = 'Top') {
  const feedUrl = BBC_FEEDS[category] || BBC_FEEDS.Top

  const attempts = [
    async () => {
      const xml = await fetchText(`/api/bbc-rss?feed=${encodeURIComponent(category)}`)
      return parseRssXml(xml)
    },
    async () => {
      const xml = await fetchText(feedUrl)
      return parseRssXml(xml)
    },
    async () => {
      const mirrors = [
        u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      ]
      for (const wrap of mirrors) {
        try {
          const xml = await fetchText(wrap(feedUrl))
          const articles = parseRssXml(xml)
          if (articles.length) return articles
        } catch { /* try next mirror */ }
      }
      throw new Error('mirrors failed')
    },
    async () => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=30`
      const res = await fetch(apiUrl)
      const data = await res.json()
      if (data.status === 'ok' && data.items?.length) {
        return data.items.map(item => ({
          title: item.title,
          description: stripHtml(item.description).slice(0, 400),
          fullDescription: stripHtml(item.description),
          url: item.link,
          image: item.thumbnail || item.enclosure?.link || null,
          publishedAt: item.pubDate,
          source: { name: data.feed?.title || 'BBC News' },
        }))
      }
      throw new Error('rss2json empty')
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
  if (cached?.articles?.length) {
    return cached.articles
  }

  throw new Error('Could not load BBC News')
}

export function getCachedNewsAge(category) {
  const cached = readCache(category)
  if (!cached?.savedAt) return null
  return cached.savedAt
}
