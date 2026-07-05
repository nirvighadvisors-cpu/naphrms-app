/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Primary - Deep Teal
        primary: {
          DEFAULT: '#01696f',
          hover: '#0c4e54',
          active: '#0f3638',
          50: '#e6f5f5',
          100: '#b3e0e2',
          200: '#80cbce',
          300: '#4db6ba',
          400: '#26a5ab',
          500: '#01696f',
          600: '#015a5f',
          700: '#0c4e54',
          800: '#0f3638',
          900: '#0a2425',
        },
        // Backgrounds
        background: {
          DEFAULT: 'var(--color-bg)',
          light: '#f7f6f2',
          dark: '#171614',
        },
        foreground: 'var(--color-text)',
        card: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text)',
        },
        popover: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text)',
        },
        muted: {
          DEFAULT: 'var(--color-surface-offset)',
          foreground: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-surface-offset)',
          foreground: 'var(--color-text)',
        },
        border: 'var(--color-border)',
        input: 'var(--color-border)',
        ring: 'var(--color-primary)',
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          light: '#f9f8f5',
          dark: '#1c1b19',
          offset: {
            DEFAULT: 'var(--color-surface-offset)',
            light: '#f0efe9',
            dark: '#242320',
          },
        },
        // Semantic Colors
        success: '#437a22',
        error: '#a12c7b',
        destructive: {
          DEFAULT: '#a12c7b',
          foreground: '#ffffff',
        },
        warning: '#964219',
        info: '#006494',
        // Text
        text: {
          DEFAULT: 'var(--color-text)',
          dark: 'var(--color-text)',
          muted: {
            DEFAULT: 'var(--color-text-muted)',
            dark: 'var(--color-text-muted)',
          },
        },
      },
      fontFamily: {
        display: ['Satoshi', 'system-ui', 'sans-serif'],
        body: ['General Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fluid type scale with clamp()
        'page-title': ['clamp(1.5rem, 1.2rem + 1.25vw, 2.25rem)', { lineHeight: '1.15', fontWeight: '700' }],
        'section-heading': ['clamp(1.125rem, 1rem + 0.75vw, 1.5rem)', { lineHeight: '1.25', fontWeight: '600' }],
        'body': ['clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', { lineHeight: '1.6' }],
        'button': ['0.875rem', { lineHeight: '1.25', fontWeight: '500' }],
        'label': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      spacing: {
        // 4px spacing system
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px oklch(0.2 0.01 80 / 0.06), 0 4px 12px oklch(0.2 0.01 80 / 0.08)',
        elevated: '0 2px 4px oklch(0.2 0.01 80 / 0.08), 0 8px 24px oklch(0.2 0.01 80 / 0.12)',
        modal: '0 4px 8px oklch(0.2 0.01 80 / 0.12), 0 16px 48px oklch(0.2 0.01 80 / 0.16)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
