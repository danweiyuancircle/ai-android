/**
 * @shell/feature-aichat 包入口：AI 对话卡带，对外暴露五样契约。
 */
// 1. 路由工厂（主入口）
export { createAIChatRoute } from './adapters/routes'
// 2. Page 组件（自行组合布局时用）
export { default as AIChatPage } from './pages/AIChatPage.vue'
// 3. 默认常量
export { aichatDefaults } from './model/constants'
// 4. 业务类型
export type { AIChatFeatureOptions } from './model/types'
