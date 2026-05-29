import { onUnmounted, watch, type Ref } from 'vue'

/**
 * 监听「返回键」：OTT 原生 Back（CustomEvent 'ott:native-keydown'，
 * detail.key==='Back' 或 detail.keyCodeString==='KEYCODE_BACK'）+ 浏览器 Escape。
 * enabled 为 true 时绑定，false 时解绑。EDialog/EDrawer 内部用。
 *
 * 事件名 'ott:native-keydown' 是壳↔H5 桥契约常量（见 template/bridge-contract.md），
 * 这里用字面量以免 tv-ui 反向依赖 @shell/core。
 */
const OTT_NATIVE_KEYDOWN = 'ott:native-keydown'

interface Options {
  enabled: Ref<boolean>
  onBack: () => void
}

export function useFocusLockedKeys({ enabled, onBack }: Options): void {
  const nativeHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string; keyCodeString?: string }>).detail
    if (!detail) return
    if (detail.key === 'Back' || detail.keyCodeString === 'KEYCODE_BACK') {
      event.stopImmediatePropagation()
      onBack()
    }
  }
  const browserHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === 'BrowserBack') {
      event.preventDefault()
      event.stopImmediatePropagation()
      onBack()
    }
  }

  function bind() {
    window.addEventListener(OTT_NATIVE_KEYDOWN, nativeHandler)
    window.addEventListener('keydown', browserHandler)
  }
  function unbind() {
    window.removeEventListener(OTT_NATIVE_KEYDOWN, nativeHandler)
    window.removeEventListener('keydown', browserHandler)
  }

  watch(
    enabled,
    (on) => {
      unbind()
      if (on) bind()
    },
    { immediate: true },
  )

  onUnmounted(unbind)
}
