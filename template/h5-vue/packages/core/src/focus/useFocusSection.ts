import { inject, onMounted, onUnmounted, provide } from 'vue'
import SpatialNavigation from './engine'
import type { Restrict, EnterTo, LeaveFor, ExtSelector } from './engine'
import { registerSection, unregisterSection } from './section-registry'
import { FOCUS_LAYER_KEY, type FocusLayerContext } from './focus-layer-context'

let sectionCounter = 0

export interface UseFocusSectionOptions {
  /** section id；未提供时自动生成 */
  id?: string
  /** 边界策略；默认 'self-first' */
  restrict?: Restrict
  /** 进入策略；默认 'last-focused' */
  enterTo?: EnterTo
  /** 跨方向跳转规则 */
  leaveFor?: LeaveFor | null
  /** 严格方向（无重叠时不跳）*/
  straightOnly?: boolean
  /** 离开后记忆来源焦点，默认 true */
  rememberSource?: boolean
  /** 进入 section 时默认聚焦的元素（CSS selector / Element） */
  defaultElement?: ExtSelector
}

export interface FocusSectionContext {
  sectionId: string
  selectorAttr: string
}

export const FOCUS_SECTION_KEY: symbol = Symbol('dwy:focus-section')

export function useFocusSection(options: UseFocusSectionOptions = {}): FocusSectionContext {
  const sectionId = options.id ?? `dwy-section-${++sectionCounter}`
  const selectorAttr = sectionId
  const enclosingLayer = inject<FocusLayerContext | null>(FOCUS_LAYER_KEY, null)

  onMounted(() => {
    ;(SpatialNavigation as any).add(sectionId, {
      selector: `[data-sn-section="${selectorAttr}"]`,
      restrict: options.restrict ?? 'self-first',
      enterTo: options.enterTo ?? 'last-focused',
      leaveFor: options.leaveFor ?? null,
      straightOnly: options.straightOnly ?? false,
      rememberSource: options.rememberSource ?? true,
      defaultElement: options.defaultElement,
    })
    registerSection(sectionId)
    // 在 FocusLayer 内的 section 标记自己，避免被 layer 一并禁用
    if (enclosingLayer) enclosingLayer.registerInnerSection(sectionId)
  })

  onUnmounted(() => {
    ;(SpatialNavigation as any).remove(sectionId)
    unregisterSection(sectionId)
  })

  const ctx: FocusSectionContext = { sectionId, selectorAttr }
  provide(FOCUS_SECTION_KEY, ctx)
  return ctx
}
