import { setupFocus } from '@shell/core/focus'
import { nativeKeyAdapter } from '@shell/core/focus'

/**
 * TV 焦点系统初始化（应用入口调用一次）：
 * 初始化 spatial-navigation + 把 OTT 原生按键事件透传为合成 keydown/keyup。
 * 收口于 tv-ui，使业务壳无需直接依赖 @shell/core/focus。
 */
export function setupTvFocus(nativeKeyEventName: string): void {
  setupFocus({ defaults: { rememberSource: true } })
  nativeKeyAdapter(nativeKeyEventName)
}
