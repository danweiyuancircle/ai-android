/**
 * @shell/core/focus 公共类型
 */

export type Direction = 'up' | 'down' | 'left' | 'right'

export type Restrict = 'self-first' | 'self-only' | 'none'

export type EnterTo = '' | 'last-focused' | 'default-element'

/**
 * <extSelector>
 * - 'querySelectorAll' 字符串
 * - NodeList / Element 数组
 * - 单个 Element
 * - '@<sectionId>' / '@'（指定 section）
 */
export type ExtSelector =
  | string
  | Element
  | Element[]
  | NodeListOf<Element>
  | ArrayLike<Element>

export interface LeaveFor {
  left?: ExtSelector
  right?: ExtSelector
  up?: ExtSelector
  down?: ExtSelector
}

export interface SectionConfig {
  /** querySelectorAll 字符串、NodeList、Element 数组、单个 Element（不接受 "@" 语法）*/
  selector?: ExtSelector
  /** 是否只允许严格方向（不允许斜向重叠） */
  straightOnly?: boolean
  /** 重叠判定阈值 [0, 1] */
  straightOverlapThreshold?: number
  /** 离开 section 时记住焦点来源（再返回时可复焦） */
  rememberSource?: boolean
  /** section 整体禁用 */
  disabled?: boolean
  /** 进入 section 时默认聚焦的元素 */
  defaultElement?: ExtSelector
  /** 进入 section 时的策略 */
  enterTo?: EnterTo
  /** 跨方向跳转规则 */
  leaveFor?: LeaveFor | null
  /** 边界策略 */
  restrict?: Restrict
  /** 不自动加 tabindex 的元素选择器 */
  tabIndexIgnoreList?: string
  /** 自定义元素可导航过滤器 */
  navigableFilter?: ((elem: Element, sectionId?: string) => boolean) | null
  /** section id（add 时可显式指定） */
  id?: string
}

export type GlobalConfig = SectionConfig

/**
 * SpatialNavigation 公开 API（薄类型，主体实现来自 fork 源码）。
 * 详见 spatial-navigation.ts。
 */
export interface SpatialNavigationAPI {
  init(): void
  uninit(): void
  clear(): void
  reset(): void
  set(config: SectionConfig): void
  set(sectionId: string, config: SectionConfig): void
  add(config: SectionConfig): string
  add(sectionId: string, config: SectionConfig): string
  remove(sectionId: string): boolean
  disable(sectionId: string): boolean
  enable(sectionId: string): boolean
  pause(): void
  resume(): void
  focus(): boolean
  focus(silent: boolean): boolean
  focus(selector: ExtSelector, silent?: boolean): boolean
  move(direction: Direction, selector?: ExtSelector): boolean
  makeFocusable(sectionId?: string): void
  setDefaultSection(sectionId?: string): void
}
