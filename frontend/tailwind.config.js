/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--text-primary)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: '#ffffff',
          dark: 'var(--primary-dark)',
        },
        surface: 'var(--surface)',
        border: 'var(--border)',
        muted: 'var(--text-secondary)',
        card: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text-primary)',
        },
        danger: {
          DEFAULT: 'var(--high-risk)',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: 'var(--medium-risk)',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: 'var(--low-risk)',
          foreground: '#ffffff',
        },
        ai: {
          DEFAULT: 'var(--ai-blue)',
          foreground: '#ffffff',
        },
        analytics: {
          DEFAULT: 'var(--analytics-purple)',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
