/**
 * @dwy/focus-vue3
 *
 * Vue 3 适配层，基于 @dwy/focus-core（fork 自 luke-chang/js-spatial-navigation, MPL 2.0）。
 */
export { setupFocus, SpatialNavigation } from './core'
export type { SetupFocusOptions } from './core'

export { useFocusable } from './useFocusable'
export type { UseFocusableOptions, UseFocusableResult } from './useFocusable'

export { useFocusSection, FOCUS_SECTION_KEY } from './useFocusSection'
export type { UseFocusSectionOptions, FocusSectionContext } from './useFocusSection'

export { useKeepAliveFocus } from './keep-alive-bridge'

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
} from '@dwy/focus-core'
