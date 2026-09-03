import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { routerStack, detectNavigationDirection } from '@shell/core'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/Home.vue')
  },
  // 示例入口。正式项目可从 Home 去掉按钮，本路由与 pages 下示例页可保留对照。
  {
    path: '/examples',
    name: 'Examples',
    component: () => import('../pages/Examples.vue')
  },
  {
    path: '/detail',
    name: 'Detail',
    component: () => import('../pages/Detail.vue')
  },
  {
    path: '/coming-soon',
    name: 'ComingSoon',
    component: () => import('../pages/ComingSoon.vue')
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('../pages/Gallery.vue')
  },
  {
    path: '/scene',
    name: 'Scene',
    component: () => import('../pages/scene/SceneView.vue')
  },
  {
    path: '/theme',
    name: 'Theme',
    component: () => import('../pages/Theme.vue')
  },
  {
    path: '/player',
    name: 'PlayerControl',
    component: () => import('../pages/PlayerControl.vue')
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const direction = detectNavigationDirection(to, from)
  routerStack.push(to, direction)
  next()
})

if (import.meta.env.DEV) {
  router.afterEach(() => {
    console.log('[Router] Stack Stats:', routerStack.getStats())
  })
}

export default router
export { routerStack }
