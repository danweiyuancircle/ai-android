import { nextTick, onActivated } from 'vue'
import {
  useFocusSection,
  useKeepAliveFocus,
  SpatialNavigation,
} from '@dwy/focus-vue3'

/**
 * EPage 的纯逻辑：注册页面级 section（last-focused 记忆）+ KeepAlive 暂停/恢复 +
 * 每次激活后聚焦本页 section（失败兜底 defaultFocus）。
 *
 * 注：这是 tv-ui 内部 composable，取代被删除的 @shell/core/useFocusPage。
 * 仅 tv-ui 包内 import；业务层用 <EPage> 组件，不直接 import 本文件。
 */
export function useEPage(id: string, defaultFocusKey?: string): void {
  useFocusSection({ id, restrict: 'self-first', enterTo: 'last-focused' })
  useKeepAliveFocus()
  onActivated(async () => {
    await nextTick()
    const ok = (SpatialNavigation as any).focus(id)
    if (!ok && defaultFocusKey) {
      ;(SpatialNavigation as any).focus(`[data-focus-key="${defaultFocusKey}"]`)
    }
  })
}
