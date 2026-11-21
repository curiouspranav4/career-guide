/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        surface: '#FFFFFF',
        sand: '#F3F0E8',
        ink: '#18181B',
        muted: '#57534E',
        coral: {
          50: '#FDF3EF',
          100: '#FCE4DB',
          200: '#F8C5B3',
          500: '#E56B45',
          600: '#D95D39',
          700: '#BC4828',
        },
        tealbrand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24, 24, 27, 0.04), 0 4px 16px rgba(24, 24, 27, 0.04)',
        lifted: '0 4px 12px rgba(24, 24, 27, 0.06), 0 16px 32px rgba(24, 24, 27, 0.06)',
      },
    },
  },
  plugins: [],
};