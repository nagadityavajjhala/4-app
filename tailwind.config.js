/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', '"Apple SD Gothic Neo"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'monospace'],
      },
      colors: {
        black: '#000000',
        surface: {
          1: '#0a0a0a',
          2: '#111111',
          3: '#1a1a1a',
          4: '#222222',
          5: '#2c2c2e',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          subtle: 'rgba(255,255,255,0.04)',
          strong: 'rgba(255,255,255,0.15)',
        },
        accent: {
          blue: '#ff453a',
          primary: '#ff453a',
          green: '#30d158',
          red: '#ff453a',
          orange: '#ff9f0a',
          purple: '#bf5af2',
          pink: '#ff375f',
          teal: '#5ac8fa',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.9)' }, to: { opacity: 1, transform: 'scale(1)' } },
        pulseDot: { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(0.8)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
