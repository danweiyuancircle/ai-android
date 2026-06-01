import type { Router, RouteLocationNormalizedLoaded } from 'vue-router'
import { aichatDefaults } from '../model/constants'

/**
 * 跳转到 AIChat 页面（语音最终结果 / 第三方拉起共用）。
 * 已在 AIChat 页时用 replace 复用当前页，否则 push。
 *
 * @param router Vue Router 实例
 * @param route 当前路由（判断是否已在 AIChat 页）
 * @param query 查询文本
 */
export function navigateToAIChat(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  query: string,
): void {
  const target = { name: aichatDefaults.name, query: { text: query } }
  if (route.name === aichatDefaults.name) {
    router.replace(target)
  } else {
    router.push(target)
  }
}
