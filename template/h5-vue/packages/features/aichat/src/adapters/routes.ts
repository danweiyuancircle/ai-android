import type { RouteRecordRaw } from 'vue-router'
import type { AIChatFeatureOptions } from '../model/types'
import { aichatDefaults } from '../model/constants'

/** 路由工厂（卡带主入口）：生成 AIChat 路由记录，组件懒加载。 */
export function createAIChatRoute(options: AIChatFeatureOptions = {}): RouteRecordRaw {
  return {
    path: options.path ?? aichatDefaults.path,
    name: options.name ?? aichatDefaults.name,
    component: () => import('../pages/AIChatPage.vue'),
    meta: options.meta,
  }
}
