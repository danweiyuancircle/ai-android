<template>
  <div
    ref="scrollContainerRef"
    :class="[
      'focusable-text-scroll',
      'focusable-base',
    ]"
    :data-focus-key="focusKey"
    @click="handleClick"
  >
    <slot :is-focused="isFocused"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, onActivated, onDeactivated } from 'vue'
import { useFocusable } from '@/composables/useFocusManager'

interface Props {
  focusKey: string
  disabled?: boolean
  groupId?: string
  scrollStep?: number // 每次滚动的步进值（px），默认40
  // 边缘事件处理器（作为props传入，可以返回boolean）
  // 返回 true 表示已处理，不允许焦点查找；返回 false 表示未处理，允许焦点查找
  onEdgeTop?: () => boolean
  onEdgeBottom?: () => boolean
  onEdgeLeft?: () => boolean
  onEdgeRight?: () => boolean
}

const props = withDefaults(defineProps<Props>(), {
  scrollStep: 40
})

const emit = defineEmits<{
  click: []
  focus: [focusKey: string]
  blur: [focusKey: string]
}>()

const isFocused = ref(false)
const scrollContainerRef = ref<HTMLElement | null>(null)
const { register, unregister } = useFocusable()

// 检查是否已经滚动到顶部
const isAtTop = (): boolean => {
  if (!scrollContainerRef.value) return true
  return scrollContainerRef.value.scrollTop === 0
}

// 检查是否已经滚动到底部
const isAtBottom = (): boolean => {
  if (!scrollContainerRef.value) return true
  const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.value
  return Math.abs(scrollHeight - clientHeight - scrollTop) < 1
}

// 向上滚动
const scrollUp = (): boolean => {
  console.log('[FocusableTextScroll] scrollUp called')
  if (!scrollContainerRef.value) {
    console.log('[FocusableTextScroll] scrollContainerRef not available')
    return false
  }
  
  if (isAtTop()) {
    // 已经在顶部，触发边缘事件
    console.log('[FocusableTextScroll] Already at top, calling onEdgeTop')
    // 如果提供了 onEdgeTop 处理器，调用它并根据返回值决定是否允许焦点查找
    if (props.onEdgeTop) {
      const handled = props.onEdgeTop()
      // 返回 true 表示已处理，不允许焦点查找；返回 false 表示未处理，允许焦点查找
      return handled
    }
    // 如果没有提供处理器，默认允许焦点查找
    return false
  }
  
  // 执行滚动
  const newScrollTop = Math.max(0, scrollContainerRef.value.scrollTop - props.scrollStep)
  console.log('[FocusableTextScroll] Scrolling up:', scrollContainerRef.value.scrollTop, '->', newScrollTop)
  scrollContainerRef.value.scrollTop = newScrollTop
  return true // 阻止默认行为，不进行焦点查找
}

// 向下滚动
const scrollDown = (): boolean => {
  console.log('[FocusableTextScroll] scrollDown called')
  if (!scrollContainerRef.value) {
    console.log('[FocusableTextScroll] scrollContainerRef not available')
    return false
  }
  
  if (isAtBottom()) {
    // 已经在底部，触发边缘事件
    console.log('[FocusableTextScroll] Already at bottom, calling onEdgeBottom')
    // 如果提供了 onEdgeBottom 处理器，调用它并根据返回值决定是否允许焦点查找
    if (props.onEdgeBottom) {
      const handled = props.onEdgeBottom()
      // 返回 true 表示已处理，不允许焦点查找；返回 false 表示未处理，允许焦点查找
      return handled
    }
    // 如果没有提供处理器，默认允许焦点查找
    return false
  }
  
  // 执行滚动
  const maxScroll = scrollContainerRef.value.scrollHeight - scrollContainerRef.value.clientHeight
  const newScrollTop = Math.min(maxScroll, scrollContainerRef.value.scrollTop + props.scrollStep)
  console.log('[FocusableTextScroll] Scrolling down:', scrollContainerRef.value.scrollTop, '->', newScrollTop)
  scrollContainerRef.value.scrollTop = newScrollTop
  return true // 阻止默认行为，不进行焦点查找
}

const handleFocus = () => {
  console.log('[FocusableTextScroll] Focus received:', props.focusKey)
  isFocused.value = true
  emit('focus', props.focusKey)
}

const handleBlur = () => {
  console.log('[FocusableTextScroll] Focus lost:', props.focusKey)
  isFocused.value = false
  emit('blur', props.focusKey)
}

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}

// 注册焦点
const registerFocus = () => {
  if (props.disabled) return
  
  register(props.focusKey, {
    groupId: props.groupId,
    onFocus: handleFocus,
    onBlur: handleBlur,
    // 使用边缘事件处理上下键滚动
    // 返回true表示已处理（执行滚动），返回false表示未处理（允许焦点查找）
    onEdgeUp: scrollUp,
    onEdgeDown: scrollDown,
    onEdgeLeft: props.onEdgeLeft,
    onEdgeRight: props.onEdgeRight,
  })
}

// 注销焦点
const unregisterFocus = () => {
  unregister(props.focusKey)
}

// 监听 focusKey 变化
watch(() => props.focusKey, (newKey, oldKey) => {
  if (oldKey) {
    unregister(oldKey)
  }
  if (newKey) {
    registerFocus()
  }
}, { immediate: false })

// 监听 disabled 变化
watch(() => props.disabled, (newDisabled) => {
  if (newDisabled) {
    unregisterFocus()
  } else {
    registerFocus()
  }
})

onMounted(() => {
  registerFocus()
})

onUnmounted(() => {
  unregisterFocus()
})

onActivated(() => {
  registerFocus()
})

onDeactivated(() => {
  unregisterFocus()
})

// 暴露方法给父组件
defineExpose({
  scrollToTop: () => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = 0
    }
  },
  scrollToBottom: () => {
    if (scrollContainerRef.value) {
      const maxScroll = scrollContainerRef.value.scrollHeight - scrollContainerRef.value.clientHeight
      scrollContainerRef.value.scrollTop = maxScroll
    }
  }
})
</script>

<style scoped>
.focusable-text-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  cursor: pointer;
  /* transition: all 0.3s ease; */
  padding: 20px;
  border-radius: 20px;
  background-color: #FFFFFF;
}

/* 自定义滚动条 */
.focusable-text-scroll::-webkit-scrollbar {
  width: 6px;
}

.focusable-text-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.focusable-text-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.focusable-text-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
