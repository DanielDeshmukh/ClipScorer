/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        'surface-card': 'var(--color-surface-card)',
        'surface-dark': 'var(--color-surface-dark)',
        'surface-dark-elevated': 'var(--color-surface-dark-elevated)',
        'surface-dark-soft': 'var(--color-surface-dark-soft)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          active: 'var(--color-primary-active)',
          disabled: 'var(--color-primary-disabled)',
        },
        ink: 'var(--color-ink)',
        body: {
          DEFAULT: 'var(--color-body)',
          strong: 'var(--color-body-strong)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          soft: 'var(--color-muted-soft)',
        },
        hairline: 'var(--color-hairline)',
        'on-dark': {
          DEFAULT: 'var(--color-on-dark)',
          soft: 'var(--color-on-dark-soft)',
        },
        'on-primary': 'var(--color-on-primary)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        'accent-teal': 'var(--color-accent-teal)',
        'accent-amber': 'var(--color-accent-amber)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
      },
    },
  },
  plugins: [],
}
