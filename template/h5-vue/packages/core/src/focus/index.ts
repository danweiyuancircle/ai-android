/**
 * @shell/core/focus
 *
 * TV 焦点系统：空间导航引擎（./engine，fork 自 luke-chang/js-spatial-navigation, MPL 2.0）
 * + Vue 3 适配层（组件 / composable / 原生按键 adapter）。
 *
 * 业务层禁止直连本入口，请用 @shell/tv-ui 的 EPage/ERow/EColumn/EFocusGroup 等组件。
 */
export { setupFocus, SpatialNavigation } from './core'
export type { SetupFocusOptions } from './core'

export { nativeKeyAdapter } from './key-source/native-event'

export { useFocusable } from './useFocusable'
export type { UseFocusableOptions, UseFocusableResult } from './useFocusable'

export { useFocusSection, FOCUS_SECTION_KEY } from './useFocusSection'
export type { UseFocusSectionOptions, FocusSectionContext } from './useFocusSection'

export { useKeepAliveFocus } from './keep-alive-bridge'
export { hasOpenLayer } from './layer-stack'

export { default as Focusable } from './Focusable.vue'
export { default as FocusSection } from './FocusSection.vue'
export { default as FocusLayer } from './FocusLayer.vue'

export type {
  Direction,
  Restrict,
  EnterTo,
  LeaveFor,
  SectionConfig,
  ExtSelector,
} from './engine'
