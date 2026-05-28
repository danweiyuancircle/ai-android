import { getCurrentInstance, inject, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { FOCUS_SECTION_KEY, type FocusSectionContext } from './useFocusSection'

export interface UseFocusableOptions {
  /** 业务侧 key，会写到 data-focus-key，便于调试与脚本聚焦 */
  focusKey?: string
  /** Enter/OK 键回调 */
  onEnter?: () => void
  /** 获得焦点 */
  onFocus?: () => void
  /** 失去焦点 */
  onBlur?: () => void
}

export interface UseFocusableResult {
  /** 绑定到 DOM 元素的 ref，必须接到 v-bind 或 ref="elRef" 上 */
  elRef: Ref<HTMLElement | null>
  /** 响应式焦点状态 */
  focused: Ref<boolean>
}

/**
 * 把当前 DOM 元素注册为可聚焦项，自动归属到最近的 useFocusSection。
 *
 * 必须在 useFocusSection 提供的 provide 作用域内调用——
 * 通常表示组件树外层有 <FocusSection> 或调用过 useFocusSection。
 */
export function useFocusable(options: UseFocusableOptions = {}): UseFocusableResult {
  const elRef = shallowRef<HTMLElement | null>(null)
  const focused = ref(false)
  const ctx = inject<FocusSectionContext | null>(FOCUS_SECTION_KEY, null)

  function handleFocused() {
    focused.value = true
    if (options.onFocus) options.onFocus()
  }
  function handleUnfocused() {
    focused.value = false
    if (options.onBlur) options.onBlur()
  }
  function handleEnter() {
    if (options.onEnter) options.onEnter()
  }

  onMounted(() => {
    const el = elRef.value
    if (!el) {
      if (getCurrentInstance()) {
        console.warn('[dwy:focus] useFocusable 的 elRef 未绑定到任何元素')
      }
      return
    }
    if (ctx) {
      el.setAttribute('data-sn-section', ctx.selectorAttr)
    } else {
      console.warn('[dwy:focus] useFocusable 未找到外层 FocusSection；当前元素不会被纳入任何导航区域')
    }
    if (options.focusKey) {
      el.setAttribute('data-focus-key', options.focusKey)
    }
    if (el.tabIndex < 0 && !el.getAttribute('tabindex')) {
      el.setAttribute('tabindex', '-1')
    }
    el.addEventListener('sn:focused', handleFocused)
    el.addEventListener('sn:unfocused', handleUnfocused)
    el.addEventListener('sn:enter-up', handleEnter)
    // 注：子 Focusable 的 onMounted 早于父 FocusSection 的 onMounted，
    // 这里不再主动调用 makeFocusable —— tabindex 已在上一句自己加好，
    // SpatialNavigation 在 navigate 时会按 selector 重新 query 到本元素。
  })

  onUnmounted(() => {
    const el = elRef.value
    if (!el) return
    el.removeEventListener('sn:focused', handleFocused)
    el.removeEventListener('sn:unfocused', handleUnfocused)
    el.removeEventListener('sn:enter-up', handleEnter)
  })

  return { elRef, focused }
}
