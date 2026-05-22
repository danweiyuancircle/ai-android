import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { routerStack, detectNavigationDirection } from '@/utils/routerStack'

// 占位路由表：保留首页、详情、AIChat（对接 bridge 拉起）、敬请期待。
// 业务页按需新增。
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/detail',
    name: 'Detail',
    component: () => import('@/views/Detail.vue')
  },
  {
    // 第三方通过 bridge 的 onNavigateToAIChat 拉起；无 AI 对话需求可删
    path: '/ai-chat',
    name: 'AIChat',
    component: () => import('@/views/AIChat.vue')
  },
  {
    path: '/coming-soon',
    name: 'ComingSoon',
    component: () => import('@/views/ComingSoon.vue')
  }
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
