<template>
  <component :is="tag" class="dwy-focus-layer">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, provide } from 'vue'
import SpatialNavigation from './engine'
import { listSections } from './section-registry'
import { FOCUS_LAYER_KEY, type FocusLayerContext } from './focus-layer-context'
import { pushLayer, popLayer } from './layer-stack'

/**
 * 模态层：挂载时 disable layer 之外的所有 section、保存焦点；
 * 卸载时 enable 回来并恢复焦点。
 *
 * 通过 provide 暴露 FocusLayerContext，子树中的 useFocusSection 会
 * 把 sectionId 注册进来——避免子 section 被一并禁用。
 *
 * 子 section 的 mount 早于本组件 onMounted，因此 innerSectionIds 在
 * 我们 onMounted 时已经收集齐全。
 */
interface Props {
  id?: string
  tag?: string
}

const props = withDefaults(defineProps<Props>(), { tag: 'div' })

const innerSectionIds = new Set<string>()
const layerCtx: FocusLayerContext = {
  layerId: props.id ?? 'dwy-focus-layer',
  registerInnerSection(id: string) {
    innerSectionIds.add(id)
  },
}
provide(FOCUS_LAYER_KEY, layerCtx)

let outerSections: string[] = []
let previousActiveElement: HTMLElement | null = null

onMounted(() => {
  pushLayer()
  previousActiveElement = (document.activeElement as HTMLElement) ?? null
  outerSections = listSections().filter((id) => !innerSectionIds.has(id))
  outerSections.forEach((id) => {
    ;(SpatialNavigation as any).disable(id)
  })
})

onUnmounted(() => {
  popLayer()
  outerSections.forEach((id) => {
    ;(SpatialNavigation as any).enable(id)
  })
  outerSections = []
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    try {
      previousActiveElement.focus()
    } catch {
      /* ignore */
    }
  }
  previousActiveElement = null
})
</script>
