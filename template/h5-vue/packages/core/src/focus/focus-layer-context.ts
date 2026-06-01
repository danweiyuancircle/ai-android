/**
 * FocusLayer 通过 provide 注入的上下文。
 * 内部 useFocusSection 通过 inject 拿到本对象，并把自己的 sectionId 注册进来，
 * 避免被 layer onMounted 时一并禁用。
 */
export interface FocusLayerContext {
  layerId: string
  registerInnerSection(sectionId: string): void
}

export const FOCUS_LAYER_KEY: symbol = Symbol('dwy:focus-layer')
