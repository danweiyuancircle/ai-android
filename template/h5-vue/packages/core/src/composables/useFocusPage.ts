import { nextTick, onActivated } from 'vue'
import { SpatialNavigation, useKeepAliveFocus } from '@dwy/focus-vue3'

/**
 * 页面焦点接入：把当前路由页接入 dwy-focus 的 KeepAlive + last-focused 焦点记忆。
 *
 * 一行解决"被切走 / 切回 / 首次进入"三场景，免去逐页写 useKeepAliveFocus +
 * onMounted / onActivated + nextTick + SpatialNavigation.focus 的样板。
 *
 * ## 用法
 *
 * ```vue
 * <template>
 *   <FocusSection id="my-page" :enter-to="'last-focused'" class="page">
 *     <EButton focus-key="my-default-btn" ... />
 *     ...
 *   </FocusSection>
 * </template>
 *
 * <script setup lang="ts">
 * import { useFocusPage } from '@shell/core'
 * useFocusPage('my-page', 'my-default-btn')
 * </script>
 * ```
 *
 * ## 契约
 *
 * - 模板根 FocusSection 的 `id` 必须等于 `sectionId`，且必须设 `enter-to="last-focused"`
 * - `defaultFocusKey` 是首次进入或 section 无记忆时的兜底；不传则只按 section 恢复
 * - 仅绑 `onActivated`：在 KeepAlive 包裹下 onActivated 也会在首次 mount 后触发，
 *   覆盖"首次 + 复活"两场景，且早于 onMounted 触发的 useKeepAliveFocus.resume()，确保 focus 调用时 SN 已 resume
 *
 * @param sectionId   当前页 FocusSection 的 id
 * @param defaultFocusKey  首次进入或无记忆时兜底聚焦的 focus-key（可选）
 */
export function useFocusPage(sectionId: string, defaultFocusKey?: string): void {
  // KeepAlive 契约：deactivated 时 pause SN，activated 时 resume SN
  useKeepAliveFocus()

  onActivated(async () => {
    await nextTick()
    const ok = SpatialNavigation.focus(sectionId)
    if (!ok && defaultFocusKey) {
      SpatialNavigation.focus(`[data-focus-key="${defaultFocusKey}"]`)
    }
  })
}
