/**
 * @shell/tv-ui
 *
 * 基于 @shell/core/focus 的 TV 端纯基础组件（全部 E 前缀，无业务无项目资产）。
 * 业务基础组件见 @shell/feature-shared。
 * 设计 token：import '@shell/tv-ui/style.css'
 * 全局样式：import '@shell/tv-ui/styles/index.css'
 */
export { default as EImage } from './components/EImage/index.vue'
export { default as EButton } from './components/EButton/index.vue'
export { default as ECard } from './components/ECard/index.vue'
export { default as EVirtual } from './components/EVirtual/index.vue'

// ─── focus / layout ───
export { default as EPage } from './components/EPage/index.vue'
export { default as EFocusGroup } from './components/EFocusGroup/index.vue'
export { default as ERow } from './components/ERow/index.vue'
export { default as EColumn } from './components/EColumn/index.vue'
export { default as EFocusable } from './components/EFocusable/index.vue'
// ─── overlay ───
export { default as EDialog } from './components/EDialog/index.vue'
export { default as EDrawer } from './components/EDrawer/index.vue'
export { default as EToast } from './components/EToast/index.vue'

// ─── 通用基础组件 ───
export { default as EText } from './components/EText/index.vue'
export { default as ELoadingSpinner } from './components/ELoadingSpinner/index.vue'
export { default as EHintDialog } from './components/EHintDialog/index.vue'

// ─── setup ───
export { setupTvFocus } from './setup'
