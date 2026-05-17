import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BBC_FEEDS = {
  Top: 'https://feeds.bbci.co.uk/news/rss.xml',
  World: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  Tech: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
  Science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  Health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
  Sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages project site: https://<user>.github.io/4-app/
  base: mode === 'production' ? '/4-app/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api/bbc-rss': {
        target: 'https://feeds.bbci.co.uk',
        changeOrigin: true,
        rewrite: (path) => {
          const qs = path.includes('?') ? path.split('?')[1] : ''
          const feed = new URLSearchParams(qs).get('feed') || 'Top'
          const target = BBC_FEEDS[feed] || BBC_FEEDS.Top
          return target.replace('https://feeds.bbci.co.uk', '')
        },
      },
    },
  },
}))
