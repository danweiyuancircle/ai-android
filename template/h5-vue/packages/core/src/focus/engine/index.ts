/**
 * @shell/core/focus
 *
 * 框架无关的 TV 空间导航核心。
 *
 * 实现 fork 自 luke-chang/js-spatial-navigation (MPL 2.0)，参见 ATTRIBUTION.md。
 */
import rawSpatialNavigation from './spatial-navigation'
import type { SpatialNavigationAPI } from './types'

// spatial-navigation.ts 用了 @ts-nocheck，需要在出口显式声明类型给下游
const SpatialNavigation = rawSpatialNavigation as unknown as SpatialNavigationAPI

export default SpatialNavigation
export { SpatialNavigation }
export * from './types'
