/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter var"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI Variable Display"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', '"Courier New"', 'monospace'],
      },
      colors: {
        canvas: 'var(--ec-canvas)',
        surface: 'var(--ec-surface)',
        elevated: 'var(--ec-elevated)',
        line: 'var(--ec-line)',
        ink: 'var(--ec-ink)',
        muted: 'var(--ec-muted)',
        accent: 'var(--ec-accent)',
        warn: 'var(--ec-warn)',
        danger: 'var(--ec-danger)',
        ok: 'var(--ec-ok)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
