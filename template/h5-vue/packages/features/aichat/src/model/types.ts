import type { RouteMeta } from 'vue-router'

/** AIChat 卡带对外可定制入口（对标 ai-quant features 的 Options 契约）。 */
export interface AIChatFeatureOptions {
  /** 路由路径，默认 '/ai-chat' */
  path?: string
  /** 路由 name，默认 'AIChat' */
  name?: string
  /** 额外路由 meta（requiresAuth / title 等） */
  meta?: RouteMeta
  /** 退出对话出口回调；预留给调用方接管返回逻辑，feature 不反向依赖壳路由 */
  onExit?: () => void
}
