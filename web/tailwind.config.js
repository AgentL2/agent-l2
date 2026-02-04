/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm rustic network palette (ClawHub-inspired simplicity)
        'surface': {
          DEFAULT: '#1c1917',   // stone-900 - main bg
          elevated: '#292524',  // stone-800 - cards
          muted: '#44403c',     // stone-700 - inputs
        },
        'ink': {
          DEFAULT: '#fafaf9',   // stone-50 - primary text
          muted: '#a8a29e',     // stone-400 - secondary
          subtle: '#78716c',    // stone-500 - tertiary
        },
        'accent': {
          DEFAULT: '#d97706',   // amber-600 - primary CTA, links
          hover: '#b45309',     // amber-700
          muted: 'rgba(217, 119, 6, 0.15)',
        },
        'border': {
          DEFAULT: '#57534e',   // stone-600
          light: '#78716c',     // stone-500
        },
        // Legacy aliases for gradual replacement
        'agent': {
          primary: '#d97706',
          secondary: '#b45309',
          accent: '#d97706',
          dark: '#1c1917',
          darker: '#0c0a09',
          card: '#292524',
          border: '#57534e',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-subtle': `linear-gradient(to right, rgba(120, 113, 108, 0.08) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(120, 113, 108, 0.08) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
