import { computed, nextTick, watch, type Ref } from 'vue'
import { SpatialNavigation } from '@shell/core/focus'
import { useFocusLockedKeys } from './useFocusLockedKeys'

interface Options {
  modelValue: Ref<boolean>
  defaultFocus: Ref<string>
  closeOnBack: Ref<boolean>
  close: () => void
}

/**
 * EDialog/EDrawer 共享逻辑：
 * - 打开后 nextTick 聚焦 defaultFocus（FocusLayer 负责隔离外层 + 关闭复焦）
 * - closeOnBack 时监听 Back/Escape → close
 * 焦点的隔离与复焦交给 <FocusLayer>（pushLayer/popLayer + 保存/恢复 activeElement），
 * 本 composable 不重复处理。
 */
export function useOverlay({ modelValue, defaultFocus, closeOnBack, close }: Options) {
  const backEnabled = computed(() => modelValue.value && closeOnBack.value)

  useFocusLockedKeys({
    enabled: backEnabled,
    onBack: close,
  })

  watch(
    modelValue,
    async (open) => {
      if (!open) return
      await nextTick()
      ;(SpatialNavigation as any).focus(`[data-focus-key="${defaultFocus.value}"]`)
    },
    { immediate: true },
  )
}
