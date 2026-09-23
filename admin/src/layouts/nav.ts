/** 后台导航定义（§4.3 九项；移动端底部 Tab 见 §4.4） */

export interface NavItem {
  name: string
  label: string
  icon: string
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', label: '工作台', icon: 'dashboard' },
  { name: 'videos', label: '视频库', icon: 'video' },
  { name: 'distributions', label: '合集分发', icon: 'share' },
  { name: 'hero-slides', label: '首页首屏', icon: 'image' },
  { name: 'company', label: '公司介绍', icon: 'company' },
  { name: 'segments', label: '业务板块', icon: 'segment' },
  { name: 'honors', label: '荣誉条目', icon: 'honor' },
  { name: 'leads', label: '预约留言', icon: 'lead' },
  { name: 'members', label: '账号与权限', icon: 'member', adminOnly: true }
]

export interface MobileTab {
  name: string
  label: string
  icon: string
}

export const MOBILE_TABS: MobileTab[] = [
  { name: 'dashboard', label: '工作台', icon: 'dashboard' },
  { name: 'videos', label: '视频库', icon: 'video' },
  { name: 'distributions', label: '合集', icon: 'share' },
  { name: 'leads', label: '留言', icon: 'lead' },
  { name: 'profile', label: '我的', icon: 'user' }
]
