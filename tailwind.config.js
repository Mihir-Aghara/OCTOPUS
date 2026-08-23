/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        octopus: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          cyan: '#06b6d4',
          rose: '#f43f5e',
          emerald: '#10b981',
          amber: '#f59e0b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      boxShadow: {
        'stripe': '0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)',
        'stripe-lg': '0 25px 50px -12px rgba(99, 102, 241, 0.15)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)'
      },
      animation: {
        'mesh-flow': 'meshFlow 12s infinite alternate ease-in-out',
        'float': 'float 6s infinite ease-in-out'
      },
      keyframes: {
        meshFlow: {
          '0%': { transform: 'scale(1) translate(0px, 0px) rotate(0deg)' },
          '50%': { transform: 'scale(1.1) translate(20px, -15px) rotate(3deg)' },
          '100%': { transform: 'scale(1.05) translate(-15px, 10px) rotate(-2deg)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      }
    },
  },
  plugins: [],
}
