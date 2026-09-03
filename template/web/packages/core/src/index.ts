/**
 * @shell/core 包总入口。
 *
 * 纯逻辑层：桥(ottService)、HTTP、导航/路由栈、通用 composables、类型。
 * 不含任何 .vue 组件，不含 pinia store。
 *
 * 焦点系统已抽离为 npm 库 @chancestv/tv-focus，业务层禁止直连，请用 @chancestv/tv-ui 组件。
 */

export * from './bridge'
export * from './http'
export * from './navigation/routerStack'
export * from './navigation/navigation'
export * from './composables/useBackButton'
export * from './composables/useRouteCache'
export * from './composables/useVoiceInteraction'
export * from './types'
