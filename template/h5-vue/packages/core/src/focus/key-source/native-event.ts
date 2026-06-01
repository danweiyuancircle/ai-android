/**
 * 把 OTT 原生方向键事件（CustomEvent）转发为标准 keydown，
 * 让 @shell/core/focus 内置的 keydown 监听透明响应原生遥控器。
 *
 * 使用：在 main.ts 调一次即可：
 *
 *   import { nativeKeyAdapter } from '@shell/core/focus'
 *   nativeKeyAdapter('ott:native-keydown')
 *
 * 期望 CustomEvent.detail 形如 { key?, keyCode?, keyCodeString? } 之一。
 */

interface NativeKeyDetail {
  key?: string
  keyCode?: number
  keyCodeString?: string
}

// Android KeyEvent → DOM key 映射（覆盖最常见键）
const ANDROID_TO_KEY: Record<number, string> = {
  19: 'ArrowUp',
  20: 'ArrowDown',
  21: 'ArrowLeft',
  22: 'ArrowRight',
  23: 'Enter',
  66: 'Enter',
  4: 'Escape',
  67: 'Backspace',
}
const KEY_STR_TO_KEY: Record<string, string> = {
  KEYCODE_DPAD_UP: 'ArrowUp',
  KEYCODE_DPAD_DOWN: 'ArrowDown',
  KEYCODE_DPAD_LEFT: 'ArrowLeft',
  KEYCODE_DPAD_RIGHT: 'ArrowRight',
  KEYCODE_DPAD_CENTER: 'Enter',
  KEYCODE_ENTER: 'Enter',
  KEYCODE_BACK: 'Escape',
  KEYCODE_DEL: 'Backspace',
}
const KEY_TO_CODE: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Enter: 13,
  Escape: 27,
  Backspace: 8,
}

function normalize(detail: NativeKeyDetail): { key: string; keyCode: number } | null {
  let key = detail.key
  if (!key && typeof detail.keyCodeString === 'string') {
    key = KEY_STR_TO_KEY[detail.keyCodeString]
  }
  if (!key && typeof detail.keyCode === 'number') {
    key = ANDROID_TO_KEY[detail.keyCode]
  }
  if (!key) return null
  const keyCode = KEY_TO_CODE[key] ?? 0
  return { key, keyCode }
}

let attachedEventName: string | null = null
let handler: ((e: Event) => void) | null = null

/**
 * 构造一个等价的 KeyboardEvent；Chromium 53 等旧内核走 createEvent 兜底。
 */
function makeKbEvent(type: 'keydown' | 'keyup', key: string, keyCode: number): KeyboardEvent {
  try {
    return new KeyboardEvent(type, {
      key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    } as KeyboardEventInit)
  } catch {
    const evt = document.createEvent('Event') as any
    evt.initEvent(type, true, true)
    Object.defineProperty(evt, 'key', { value: key })
    Object.defineProperty(evt, 'keyCode', { value: keyCode })
    Object.defineProperty(evt, 'which', { value: keyCode })
    return evt as KeyboardEvent
  }
}

/**
 * 注册原生事件名监听器（如 'ott:native-keydown'），把它转为 keydown + keyup 派发到 window。
 *
 * 为什么成对派发：Android 壳 dispatchKeyEvent 只在 ACTION_DOWN 透传 onNativeKeyDown，
 * 不发 ACTION_UP。但 focus-core 的 'enter-up' 事件挂在原生 keyup 上（spatial-navigation.ts onKeyUp），
 * EButton/useFocusable 又只监听 'sn:enter-up'。只派 keydown 会导致 OK 键完全失活。
 * 这里同步补一个 keyup，让 OTT 链路对外契约与浏览器键盘一致："按一次 = down+up 成对"。
 *
 * 重复调用会先卸载上一个监听。
 */
export function nativeKeyAdapter(eventName: string): () => void {
  if (typeof window === 'undefined') return () => undefined
  // 卸载旧的
  if (attachedEventName && handler) {
    window.removeEventListener(attachedEventName, handler as EventListener)
  }
  attachedEventName = eventName
  handler = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as NativeKeyDetail
    const n = normalize(detail)
    if (!n) return
    window.dispatchEvent(makeKbEvent('keydown', n.key, n.keyCode))
    window.dispatchEvent(makeKbEvent('keyup', n.key, n.keyCode))
  }
  window.addEventListener(eventName, handler as EventListener)
  return () => {
    if (attachedEventName && handler) {
      window.removeEventListener(attachedEventName, handler as EventListener)
      attachedEventName = null
      handler = null
    }
  }
}

export default nativeKeyAdapter
