import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { routerStack, detectNavigationDirection } from '@shell/core'
import { createAIChatRoute } from '@shell/feature-aichat'

// 装配层路由表：壳内置页直接 import，业务卡带用 create*Route() 工厂挂载。
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/Home.vue')
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
    path: '/perf',
    name: 'Perf',
    component: () => import('../pages/Perf.vue')
  },
  {
    path: '/playground',
    name: 'Playground',
    component: () => import('../pages/Playground.vue')
  },
  // AIChat 卡带（bridge 的 onNavigateToAIChat 拉起）；无 AI 对话需求可删此行
  createAIChatRoute({ path: '/ai-chat' })
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：记录路由栈
router.beforeEach((to, from, next) => {
  const direction = detectNavigationDirection(to, from)
  routerStack.push(to, direction)
  next()
})

// 开发环境下打印路由栈信息
if (import.meta.env.DEV) {
  router.afterEach(() => {
    console.log('[Router] Stack Stats:', routerStack.getStats())
  })
}

export default router
export { routerStack }
