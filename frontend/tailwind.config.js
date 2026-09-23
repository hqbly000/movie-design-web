/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0A0A0A',
        surface: '#14120F',
        'surface-input': '#0F0E0C',
        'border-hairline': '#1F1F1F',
        'txt-primary': '#FAFAFA',
        'accent-orange': '#FF6A00',
        'accent-gold': '#C49A4A',
        'accent-gold-light': '#E8C77A',
        'hl-gold': '#F0D9A0',
        ivory: '#F4F0E8',
        'light-section': '#F4F0E8',
        'ghost-stroke': '#FFD9BF',
        ink: '#1A1A1A',
        'muted-since': '#8A919C'
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Songti SC', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        latin: ['Cormorant', '"Times New Roman"', 'serif']
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
        ctrl: '10px',
        nav: '8px',
        chip: '6px'
      },
      boxShadow: {
        'card-soft': '0 8px 24px -4px rgba(0,0,0,0.05)',
        'modal-soft': '0 24px 60px -12px rgba(0,0,0,0.18)',
        'player': '0 30px 80px -20px rgba(0,0,0,0.9)'
      },
      maxWidth: {
        desktop: '1440px'
      },
      transitionTimingFunction: {
        'ease-out-soft': 'cubic-bezier(0.22, 0.61, 0.36, 1)'
      },
      keyframes: {
        kenburns: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'lamp-breath': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.94' }
        }
      },
      animation: {
        kenburns: 'kenburns 6s linear forwards',
        'fade-up': 'fade-up 400ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'lamp-breath': 'lamp-breath 6s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
