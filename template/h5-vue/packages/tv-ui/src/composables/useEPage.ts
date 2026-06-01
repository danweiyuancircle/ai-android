import { nextTick, onActivated, onMounted } from 'vue'
import {
  useFocusSection,
  useKeepAliveFocus,
  SpatialNavigation,
} from '@shell/core/focus'

/**
 * EPage 的纯逻辑：注册页面级 section（last-focused 记忆）+ KeepAlive 暂停/恢复 +
 * 进页后聚焦本页 section（失败兜底 defaultFocus）。
 *
 * 同时挂 onMounted 与 onActivated：onMounted 覆盖首次进页（KeepAlive 首次挂载子树时，
 * EPage 作为孙组件的 onActivated 不一定触发——会漏掉首屏聚焦），onActivated 覆盖
 * KeepAlive 复活返回。两者都触发时重复聚焦同一元素，无副作用。
 *
 * 注：这是 tv-ui 内部 composable，取代被删除的 @shell/core/useFocusPage。
 * 仅 tv-ui 包内 import；业务层用 <EPage> 组件，不直接 import 本文件。
 */
export function useEPage(id: string, defaultFocusKey?: string): void {
  useFocusSection({ id, restrict: 'self-first', enterTo: 'last-focused' })
  useKeepAliveFocus()
  const focusPage = async () => {
    await nextTick()
    // 离开页 onDeactivated→pause() 与本页激活同帧执行，会把 SN 关停（进页后遥控器无响应）。
    // nextTick 后所有同步钩子已跑完，此处 resume 保证可见页 SN 必为活动态。
    ;(SpatialNavigation as any).resume()
    const ok = (SpatialNavigation as any).focus(id)
    if (!ok && defaultFocusKey) {
      ;(SpatialNavigation as any).focus(`[data-focus-key="${defaultFocusKey}"]`)
    }
  }
  onMounted(focusPage)
  onActivated(focusPage)
}
