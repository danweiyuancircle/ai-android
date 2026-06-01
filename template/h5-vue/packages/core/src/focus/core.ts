import SpatialNavigation from './engine'
import type { SectionConfig } from './engine'

let initialized = false

export interface SetupFocusOptions {
  /** 应用到 GlobalConfig 的默认配置（每个 section 可单独覆盖）*/
  defaults?: Partial<SectionConfig>
}

/**
 * 初始化全局 SpatialNavigation。多次调用幂等。
 *
 * 在应用启动（main.ts）调用一次即可。
 */
export function setupFocus(options: SetupFocusOptions = {}): void {
  if (initialized) return
  SpatialNavigation.init()
  if (options.defaults) {
    ;(SpatialNavigation as any).set(options.defaults)
  }
  initialized = true
}

export { SpatialNavigation }
