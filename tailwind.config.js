/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './_layouts/**/*.html',
    './_includes/**/*.html',
    './submissions/**/*.{html,md}',
    './*.{html,md}',
    './**/*.html'
  ],
  theme: {
    extend: {
      // City of Austin Brand Colors
      colors: {
        brand: {
          navy: '#22254E',
          indigo: '#44499C',
          sky: '#009CDE',
          sea: '#009F4D',
          forest: '#008743',
          gold: '#FFC600',
          cream: '#f7f6f5',
          stone: '#636262',
          cloud: '#C6C5C4',
          purple: '#9F3CC9',
          orange: '#FF8F00',
        },
        surface: {
          base: '#f7f6f5',
          lightBlue: '#E8F4FA',
        },
        // Vote category colors
        'vote-favorite': {
          DEFAULT: '#f472b6',
          light: '#fce7f3',
          dark: '#db2777'
        }
      },

      // Typography
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Source Sans 3', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // Animations
      animation: {
        'pop': 'pop 300ms ease-out',
        'bump': 'bump 300ms ease-out',
        'slide-up': 'slide-up 300ms ease-out',
        'fade-out': 'fade-out 200ms ease-out forwards',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },

      keyframes: {
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' }
        },
        bump: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' }
        },
        'slide-up': {
          '0%': { transform: 'translateX(-50%) translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateX(-50%) translateY(0)', opacity: '1' }
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        }
      },

      // Shadows
      boxShadow: {
        'card': '0 4px 20px rgba(34, 37, 78, 0.08)',
        'card-hover': '0 12px 32px rgba(34, 37, 78, 0.12)',
        'button': '0 4px 14px rgba(0, 156, 222, 0.4)',
        'button-hover': '0 6px 20px rgba(68, 73, 156, 0.4)',
      },

      // Transitions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // Typography plugin customizations
      typography: (theme) => ({
        brand: {
          css: {
            '--tw-prose-body': theme('colors.brand.stone'),
            '--tw-prose-headings': theme('colors.brand.navy'),
            '--tw-prose-links': theme('colors.brand.sky'),
            '--tw-prose-bold': theme('colors.brand.navy'),
            '--tw-prose-counters': theme('colors.brand.indigo'),
            '--tw-prose-bullets': theme('colors.brand.sky'),
            '--tw-prose-hr': theme('colors.brand.cloud'),
            '--tw-prose-quotes': theme('colors.brand.navy'),
            '--tw-prose-quote-borders': theme('colors.brand.sky'),
            '--tw-prose-captions': theme('colors.brand.stone'),
            '--tw-prose-code': theme('colors.brand.indigo'),
            '--tw-prose-pre-code': theme('colors.brand.cream'),
            '--tw-prose-pre-bg': theme('colors.brand.navy'),
            '--tw-prose-th-borders': theme('colors.brand.cloud'),
            '--tw-prose-td-borders': theme('colors.brand.cloud'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
