/**
 * 路由表（architecture.md §5.1）。
 * `/` → HomeView（单页长滚动）；`/share/:token` → ShareView；兜底重定向到 `/`。
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '光屿摄影 LIGHT ISLE STUDIO · 以光影，铭记时光' }
  },
  {
    path: '/share/:token',
    name: 'share',
    component: () => import('@/views/ShareView.vue'),
    meta: { title: '临时合集预览 · 光屿摄影' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') {
    document.title = title
  }
})

export default router
