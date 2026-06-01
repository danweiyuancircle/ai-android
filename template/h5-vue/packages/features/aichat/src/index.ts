/**
 * @shell/feature-aichat 包入口：AI 对话卡带，对外暴露契约。
 */
// 1. 路由工厂（主入口）
export { createAIChatRoute } from './adapters/routes'
// 1b. 跳转 + 第三方拉起 bridge（语音最终结果 / 基座 onNavigateToAIChat 共用，原属 core）
export { navigateToAIChat } from './adapters/navigation'
export { registerAIChatDeepLink } from './adapters/bridge'
// 2. Page 组件（自行组合布局时用）
export { default as AIChatPage } from './pages/AIChatPage.vue'
// 3. 默认常量
export { aichatDefaults } from './model/constants'
// 4. 业务类型
export type { AIChatFeatureOptions } from './model/types'
