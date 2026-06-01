import { getCurrentInstance, onActivated, onDeactivated } from 'vue'
import SpatialNavigation from './engine'

/**
 * 在 Vue KeepAlive 缓存页面中使用：被切走时暂停 SpatialNavigation，被切回时恢复。
 *
 * 用法：在被 KeepAlive 包裹的 view 组件 setup 顶部调用一次。
 */
export function useKeepAliveFocus(): void {
  if (!getCurrentInstance()) return
  onActivated(() => {
    ;(SpatialNavigation as any).resume()
  })
  onDeactivated(() => {
    ;(SpatialNavigation as any).pause()
  })
}
