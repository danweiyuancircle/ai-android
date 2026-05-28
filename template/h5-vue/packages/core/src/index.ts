/**
 * @shell/core 包总入口。
 *
 * 纯逻辑层：桥(ottService)、焦点框架、HTTP、配置、导航/路由栈、通用 composables、
 * 工具与类型。不含任何 .vue 组件，不含 pinia store。
 */

// 桥
export * from './bridge'
// 焦点框架
export * from './focus/useFocusManager'
// HTTP
export * from './http'
// 配置（loadConfig / getConfig / configManager 等）
export * from './config'
// 导航 / 路由栈
export * from './navigation/routerStack'
export * from './navigation/navigation'
// 通用 composables
export * from './composables/useBackButton'
export * from './composables/useFocusRestore'
export * from './composables/useRouteCache'
export * from './composables/useVoiceInteraction'
// 工具
export * from './utils/image'
export * from './utils/appUtils'
// 类型
export * from './types'
