import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** 无需登录 */
    public?: boolean
    /** 仅 admin 可见（账号与权限） */
    adminOnly?: boolean
    /** 顶栏兜底标题（视图会用 usePageHeader 覆盖） */
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: { name: 'dashboard' },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '工作台' }
      },
      {
        path: 'videos',
        name: 'videos',
        component: () => import('@/views/VideosView.vue'),
        meta: { title: '视频库' }
      },
      {
        path: 'distributions',
        name: 'distributions',
        component: () => import('@/views/DistributionsView.vue'),
        meta: { title: '合集分发' }
      },
      {
        path: 'hero-slides',
        name: 'hero-slides',
        component: () => import('@/views/HeroSlidesView.vue'),
        meta: { title: '首页首屏' }
      },
      {
        path: 'company',
        name: 'company',
        component: () => import('@/views/CompanyView.vue'),
        meta: { title: '公司介绍' }
      },
      {
        path: 'segments',
        name: 'segments',
        component: () => import('@/views/SegmentsView.vue'),
        meta: { title: '业务板块' }
      },
      {
        path: 'honors',
        name: 'honors',
        component: () => import('@/views/HonorsView.vue'),
        meta: { title: '荣誉条目' }
      },
      {
        path: 'leads',
        name: 'leads',
        component: () => import('@/views/LeadsView.vue'),
        meta: { title: '预约留言' }
      },
      {
        path: 'members',
        name: 'members',
        component: () => import('@/views/MembersView.vue'),
        meta: { title: '账号与权限', adminOnly: true }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '我的' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

/** 全局前置守卫：未登录 → /login；editor/viewer 访问 adminOnly → 工作台 */
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.token && !auth.user) await auth.ensureLoaded()

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }
  if (!auth.isAuthenticated) {
    return {
      name: 'login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined
    }
  }
  if (to.meta.adminOnly && !auth.isAdmin) return { name: 'dashboard' }
  return true
})

export default router
