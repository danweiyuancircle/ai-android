/**
 * @dwy/tv-ui
 *
 * 基于 @dwy/focus-vue3 的 TV 端可复用 UI 组件。
 * 引入样式：import '@dwy/tv-ui/style.css'
 */
export { default as EImage } from './components/EImage/index.vue'
export { default as EButton } from './components/EButton/index.vue'
export { default as ECard } from './components/ECard/index.vue'
export { default as EVirtualList } from './components/EVirtualList/index.vue'

// ─── focus / layout ───
export { default as EPage } from './components/EPage/index.vue'
export { default as EFocusGroup } from './components/EFocusGroup/index.vue'
export { default as ERow } from './components/ERow/index.vue'
export { default as EColumn } from './components/EColumn/index.vue'
export { default as EFocusable } from './components/EFocusable/index.vue'
export { default as EHRow } from './components/EHRow/index.vue'
// ─── overlay ───
export { default as EDialog } from './components/EDialog/index.vue'
export { default as EDrawer } from './components/EDrawer/index.vue'
export { default as EToast } from './components/EToast/index.vue'

// ─── setup ───
export { setupTvFocus } from './setup'
