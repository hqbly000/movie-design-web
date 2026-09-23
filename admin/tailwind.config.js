/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  /**
   * safelist：凡通过映射表/变量间接引用、但可能被内容扫描漏掉的组件类，在此兜底。
   * 2026-09-23 事故：AppButton 用 `ad-btn-${variant}` 模板字符串拼类名，
   * Tailwind 内容扫描识别不了动态拼接，把 5 个按钮变体 + 4 个状态胶囊变体
   * 全部从产物 CSS 中清除，导致后台所有按钮失去颜色。
   * 已在 AppButton / StatusPill 改为字面量映射表（根治），此处 safelist 仅作双保险。
   */
  safelist: [
    'ad-btn-primary',
    'ad-btn-secondary',
    'ad-btn-soft',
    'ad-btn-text',
    'ad-btn-danger-text',
    'ad-pill-ok',
    'ad-pill-neutral',
    'ad-pill-expired',
    'ad-pill-accent'
  ],
  theme: {
    extend: {
      colors: {
        'bg-page': '#F5F5F7',
        'ad-surface': '#FFFFFF',
        // 边框体系（2026-09-23 加深）：#EDEDF0 在纯白上肉眼几乎不可见，
        // 卡片/表格行用 ad-border，输入框/按钮用 ad-border-control，
        // 结构性分界（侧栏右缘/顶栏下缘/底部Tab上缘/表头下缘）用 ad-border-strong
        'ad-border': '#E6E6EB',
        'ad-border-control': '#DFDFE5',
        'ad-border-strong': '#D5D5DC',
        'ad-fill': '#F7F7F9',
        'ad-text': '#1D1D1F',
        'ad-text-2': '#4A4A4F',
        'ad-text-3': '#6E6E73',
        'ad-text-4': '#8E8E93',
        accent: '#0071E3',
        'accent-soft': '#EAF3FF',
        'ok-bg': '#E8F5EC',
        'ok-text': '#1E7A4B',
        'neutral-bg': '#F2F2F7',
        'neutral-text': '#6E6E73',
        'expired-bg': '#F6F0EF',
        'expired-text': '#8A4A3A',
        'brand-gold': '#C49A4A',
        'row-hover': '#FAFAFB'
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif']
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
        'modal-soft': '0 24px 60px -12px rgba(0,0,0,0.18)'
      },
      spacing: {
        sidebar: '232px',
        topbar: '80px',
        tabbar: '64px'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
        'pop-in': 'pop-in 200ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'slide-up': 'slide-up 240ms cubic-bezier(0.22, 0.61, 0.36, 1) both'
      }
    }
  },
  plugins: []
}
