/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Page & surface
        bg:              '#f8fafc',   // slate-50
        surface:         '#ffffff',
        surface2:        '#f1f5f9',   // slate-100
        border:          '#e2e8f0',   // slate-200
        'border-strong': '#cbd5e1',   // slate-300

        // Text
        ink:             '#0f172a',   // slate-900
        ink2:            '#475569',   // slate-600
        ink3:            '#94a3b8',   // slate-400

        // Sidebar
        sidebar:         '#0f172a',   // slate-900

        // Semantic
        amber:           '#d97706',
        'amber-light':   '#fef3c7',
        'amber-dark':    '#92400e',
        teal:            '#0d9488',
        'teal-light':    '#ccfbf1',
        'teal-dark':     '#0d4e49',
        danger:          '#dc2626',
        'danger-light':  '#fee2e2',
        info:            '#1d4ed8',   // blue-700 — primary
        'info-light':    '#dbeafe',
        success:         '#15803d',
        'success-light': '#dcfce7',
      },
      fontFamily: {
        // DM Serif Display — page titles only
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        // Keep serif alias for any existing references
        serif:   ['"DM Serif Display"', 'Georgia', 'serif'],
        // Figtree — all UI text
        sans:    ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // DM Mono — every number, hour value, currency
        mono:    ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm:      '4px',
        DEFAULT: '8px',
        lg:      '12px',
        full:    '9999px',
      },
    },
  },
  plugins: [],
}