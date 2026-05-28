import { ref, onMounted, onActivated, onDeactivated } from 'vue'
import { useFocusable } from '../focus/useFocusManager'

/**
 * 焦点恢复 Composable
 * 用于 keep-alive 场景下的焦点状态管理
 * 
 * @param defaultFocusKey 默认焦点键
 * @param restoreDelay 恢复焦点的延迟时间（毫秒）
 * @returns 焦点管理相关的方法和状态
 * 
 * @example
 * ```typescript
 * const { setupFocus } = useFocusRestore('item-0')
 * 
 * onMounted(async () => {
 *   await loadData()
 *   setupFocus() // 设置初始焦点
 * })
 * ```
 */
export function useFocusRestore(
  defaultFocusKey: string,
  restoreDelay: number = 50
) {
  const { setFocus, getCurrentFocusKey } = useFocusable()
  
  // 保存的焦点键
  const savedFocusKey = ref<string | null>(null)
  
  /**
   * 设置初始焦点（仅在首次挂载时）
   * 在 onMounted 中加载完数据后调用
   */
  const setupFocus = () => {
    if (!savedFocusKey.value) {
      console.log('[useFocusRestore] 设置初始焦点:', defaultFocusKey)
      setFocus(defaultFocusKey)
    }
  }
  
  /**
   * 检查 focus-key 是否是 MultiColumnScrollView 的特殊标识
   * MultiColumnScrollView 使用 multi-column-item- 前缀
   */
  const isMultiColumnScrollViewKey = (focusKey: string): boolean => {
    return focusKey.startsWith('multi-column-item-')
  }
  
  /**
   * 恢复焦点到之前保存的位置
   * 内部使用，自动在 onActivated 中调用
   */
  const restoreFocus = () => {
    console.log('[useFocusRestore] onActivated - 恢复焦点')
    
    if (savedFocusKey.value) {
      console.log('[useFocusRestore] 恢复焦点到:', savedFocusKey.value)
      // 如果是 MultiColumnScrollView 的焦点，恢复时不滑动
      const noScroll = isMultiColumnScrollViewKey(savedFocusKey.value)
      if (noScroll) {
        console.log('[useFocusRestore] 检测到 MultiColumnScrollView 焦点，恢复时不滑动')
      }
      setTimeout(() => {
        setFocus(savedFocusKey.value!, noScroll)
      }, restoreDelay)
    } else {
      console.log('[useFocusRestore] 设置默认焦点:', defaultFocusKey)
      // 检查默认焦点是否也是 MultiColumnScrollView 的焦点
      const noScroll = isMultiColumnScrollViewKey(defaultFocusKey)
      setTimeout(() => {
        setFocus(defaultFocusKey, noScroll)
      }, restoreDelay)
    }
  }
  
  /**
   * 保存当前焦点位置
   * 内部使用，自动在 onDeactivated 中调用
   */
  const saveFocus = () => {
    const currentKey = getCurrentFocusKey()
    if (currentKey) {
      savedFocusKey.value = currentKey
      console.log('[useFocusRestore] saveFocus:', currentKey)
    }
  }
  
  /**
   * 手动清除保存的焦点
   * 用于数据重新加载等场景
   */
  const clearSavedFocus = () => {
    console.log('[useFocusRestore] 清除保存的焦点')
    savedFocusKey.value = null
  }
  
  /**
   * 手动保存指定的焦点键
   * @param focusKey 要保存的焦点键
   */
  const setSavedFocus = (focusKey: string) => {
    console.log('[useFocusRestore] 手动保存焦点:', focusKey)
    savedFocusKey.value = focusKey
  }
  
  // 自动注册生命周期钩子
  onActivated(() => {
    console.log('[useFocusRestore] onActivated')
    restoreFocus()
  })
  
  onDeactivated(() => {
    console.log('[useFocusRestore] onDeactivated')
    saveFocus()
  })
  
  return {
    setupFocus,        // 设置初始焦点（在 onMounted 中调用）
    savedFocusKey,     // 保存的焦点键（只读）
    clearSavedFocus,   // 清除保存的焦点
    setSavedFocus      // 手动设置保存的焦点
  }
}
