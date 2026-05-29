<template>
  <FocusSection
    :id="sectionId"
    :restrict="restrict"
    :enter-to="enterTo"
    tag="div"
    class="e-hrow"
    :style="{ width: viewportWidth + 'px', height: height === 'auto' ? 'auto' : height + 'px' }"
  >
    <div
      ref="trackRef"
      class="e-hrow__track"
      :style="{ transform: `translateX(${-scrollOffset}px)`, transition: animate ? 'transform 0.18s ease' : 'none' }"
    >
      <div
        v-for="(item, index) in items"
        :key="keyFor(item, index)"
        class="e-hrow__col"
        :style="{ width: itemSize + 'px' }"
      >
        <slot
          :item="item"
          :index="index"
          :focusKey="`${focusKeyPrefix}-${index}`"
        />
      </div>
    </div>
  </FocusSection>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { FocusSection } from '@dwy/focus-vue3'
import type { Restrict, EnterTo } from '@dwy/focus-core'

interface Props<TItem> {
  items: TItem[]
  itemSize: number
  visibleCount: number
  sectionId: string
  focusKeyPrefix?: string
  itemKey?: keyof TItem | ((item: TItem, index: number) => string | number)
  restrict?: Restrict
  enterTo?: EnterTo
  height?: number | 'auto'
  /** 滚动是否带动画 */
  animate?: boolean
}

const props = withDefaults(defineProps<Props<T>>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  height: 'auto',
  animate: true,
  focusKeyPrefix: undefined,
})

const focusKeyPrefix = computed(() => props.focusKeyPrefix ?? `hrow-${props.sectionId}-item`)

const trackRef = ref<HTMLElement | null>(null)
const scrollOffset = ref(0)
const viewportWidth = computed(() => props.itemSize * props.visibleCount)

function keyFor(item: T, index: number): string | number {
  if (typeof props.itemKey === 'function') return props.itemKey(item, index)
  if (props.itemKey && item && typeof item === 'object') {
    const v = (item as any)[props.itemKey]
    if (v != null) return v as string | number
  }
  return index
}

function trackFocus(index: number) {
  const startIdx = Math.round(scrollOffset.value / props.itemSize)
  const endIdx = startIdx + props.visibleCount - 1
  if (index < startIdx) {
    scrollOffset.value = index * props.itemSize
  } else if (index > endIdx) {
    scrollOffset.value = (index - props.visibleCount + 1) * props.itemSize
  }
}

function onSnFocused(e: Event) {
  const target = e.target as HTMLElement | null
  const key = target?.getAttribute('data-focus-key')
  if (!key) return
  const prefix = focusKeyPrefix.value + '-'
  if (!key.startsWith(prefix)) return
  const idx = parseInt(key.slice(prefix.length), 10)
  if (!Number.isNaN(idx)) trackFocus(idx)
}

onMounted(() => {
  trackRef.value?.parentElement?.addEventListener('sn:focused', onSnFocused, true)
})

onUnmounted(() => {
  trackRef.value?.parentElement?.removeEventListener('sn:focused', onSnFocused, true)
})

// items 减少导致 scrollOffset 超界时，回拉
watch(
  () => props.items.length,
  (len) => {
    const maxOffset = Math.max(0, (len - props.visibleCount) * props.itemSize)
    if (scrollOffset.value > maxOffset) scrollOffset.value = maxOffset
  },
)

defineExpose({ scrollOffset, trackFocus })
</script>

<style scoped>
.e-hrow {
  overflow: hidden;
  position: relative;
}
.e-hrow__track {
  display: flex;
  will-change: transform;
}
.e-hrow__col {
  box-sizing: border-box;
  flex-shrink: 0;
}
</style>
