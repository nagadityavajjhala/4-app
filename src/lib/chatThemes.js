export const CHAT_THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    sent: '#ff453a',
    received: 'rgba(44, 44, 46, 0.95)',
    bg: '#000000',
    header: 'rgba(0,0,0,0.85)',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    sent: '#5e5ce6',
    received: 'rgba(30, 30, 60, 0.95)',
    bg: '#0a0a14',
    header: 'rgba(10,10,20,0.9)',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    sent: '#30d158',
    received: 'rgba(28, 48, 36, 0.95)',
    bg: '#050a07',
    header: 'rgba(5,15,10,0.9)',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    sent: '#ff9f0a',
    received: 'rgba(50, 38, 28, 0.95)',
    bg: '#0f0805',
    header: 'rgba(20,10,5,0.9)',
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    sent: '#ff375f',
    received: 'rgba(50, 28, 36, 0.95)',
    bg: '#0f0508',
    header: 'rgba(20,5,10,0.9)',
  },
}

const STORAGE_KEY = '4-chat-themes'

export function getChatTheme(convoId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return CHAT_THEMES[all[convoId]] || CHAT_THEMES.classic
  } catch {
    return CHAT_THEMES.classic
  }
}

export function setChatTheme(convoId, themeId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    all[convoId] = themeId
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}
