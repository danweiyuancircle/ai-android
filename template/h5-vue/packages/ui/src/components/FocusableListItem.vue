<template>
  <div
    :class="[
      'focusable-item', 
      'focusable-base',
      { 'focused-default': isFocused }
    ]"
    :data-focus-key="focusKey"
    @click="handleClick"
  >
    <!-- 内容插槽 -->
    <slot 
      :is-focused="isFocused" 
      :data="data"
    ></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject, onActivated, onDeactivated } from 'vue'
import { useFocusable } from '@shell/core'

interface Props {
  focusKey: string
  data?: any
  disabled?: boolean
  groupId?: string // 焦点分组ID
  // 边缘事件处理器（作为props传入，可以返回boolean）
  onEdgeLeft?: () => boolean
  onEdgeRight?: () => boolean
  onEdgeUp?: () => boolean
  onEdgeDown?: () => boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: [data: any]
  focus: [focusKey: string]
  blur: [focusKey: string]
  enter: [data: any]
}>()

const isFocused = ref(false)
const { register, unregister } = useFocusable()

// 获取滚动容器的引用
const multiColumnScroll = inject<any>('multiColumnScroll', null)

const handleFocus = (noScroll: boolean = false) => {
  isFocused.value = true
  emit('focus', props.focusKey)
  
  if (noScroll) {
    // 恢复焦点时，确保元素在可视区域内但不使用平滑滚动
    if (multiColumnScroll && multiColumnScroll.ensureFocusKeyVisible) {
      multiColumnScroll.ensureFocusKeyVisible(props.focusKey)
    }
    return
  }
  
  // 正常焦点改变时，滚动到该元素使其居中（使用平滑滚动）
  if (multiColumnScroll && multiColumnScroll.scrollToFocusKey) {
    multiColumnScroll.scrollToFocusKey(props.focusKey)
  }
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur', props.focusKey)
}

const handleClick = () => {
  if (!props.disabled) {
    emit('click', props.data)
  }
}

const handleEnter = () => {
  if (!props.disabled) {
    emit('enter', props.data)
    emit('click', props.data)
  }
}

// 注册和注销焦点
const registerFocus = () => {
  if (props.disabled) return
  
  register(props.focusKey, {
    groupId: props.groupId,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onEnter: handleEnter,
    onEdgeLeft: props.onEdgeLeft,
    onEdgeRight: props.onEdgeRight,
    onEdgeUp: props.onEdgeUp,
    onEdgeDown: props.onEdgeDown
  })
}

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

</script>

<style scoped>
.focusable-item {
  position: relative;
  cursor: pointer;
  height: 100%;
  width: 100%;
  border-radius: var(--focus-border-radius);}
</style>
