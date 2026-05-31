import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PartnerShip dark palette — deep slate base, warm accent for "ship" actions
        base: {
          950: '#0a0c10',
          900: '#0e1116',
          850: '#141821',
          800: '#1a1f29',
          700: '#252b38',
          600: '#323a4b'
        },
        ink: {
          DEFAULT: '#e6e9ef',
          dim: '#9aa3b2',
          faint: '#6b7385'
        },
        // user = cyan, agent = violet (side-by-side identity)
        user: '#36c5f0',
        agent: '#a855f7',
        ship: '#22c55e',
        warnglow: '#22c55e'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,197,94,0.5), 0 0 18px 2px rgba(34,197,94,0.35)'
      },
      keyframes: {
        pulseglow: {
          '0%,100%': { boxShadow: '0 0 0 1px rgba(34,197,94,0.5), 0 0 10px 1px rgba(34,197,94,0.25)' },
          '50%': { boxShadow: '0 0 0 1px rgba(34,197,94,0.8), 0 0 22px 4px rgba(34,197,94,0.5)' }
        }
      },
      animation: {
        pulseglow: 'pulseglow 1.8s ease-in-out infinite'
      }
    }
  },
  plugins: []
} satisfies Config
