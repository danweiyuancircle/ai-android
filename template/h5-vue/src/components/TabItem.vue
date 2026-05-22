<template>
  <div 
    :class="[
      'tab-item',
      // 'focusable-base',
      // 'focused-default',
      { 
        'active': isActive,
        'focused': isFocused
      }
    ]"
    :data-focus-key="focusKey"
    @click="handleClick"
  >
    <span class="tab-text">{{ label }}</span>
    <div class="tab-indicator"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useFocusable } from '@/composables/useFocusManager'

interface Props {
  focusKey: string
  label: string
  isActive?: boolean
  groupId?: string
  isFirst?: boolean
  isLast?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  groupId: 'tab-group',
  isFirst: false,
  isLast: false
})

const emit = defineEmits<{
  click: []
  focus: []
  blur: []
}>()

const isFocused = ref(false)
const { register, unregister } = useFocusable()

const handleClick = () => {
  emit('click')
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

// 左边缘处理（第一个Tab，阻止向左查找焦点）
const handleEdgeLeft = () => {
  if (props.isFirst) {
    console.log('[TabItem] 第一个Tab，阻止向左查找焦点')
    return true // 阻止默认行为
  }
  return false
}

// 右边缘处理（最后一个Tab，阻止向右查找焦点）
const handleEdgeRight = () => {
  if (props.isLast) {
    console.log('[TabItem] 最后一个Tab，阻止向右查找焦点')
    return true // 阻止默认行为
  }
  return false
}

const registerFocus = () => {
  register(props.focusKey, {
    groupId: props.groupId,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onEnter: handleClick,
    onEdgeLeft: handleEdgeLeft,
    onEdgeRight: handleEdgeRight
  })
}

onMounted(() => {
  registerFocus()
})

onUnmounted(() => {
  unregister(props.focusKey)
})

onActivated(() => {
  registerFocus()
})

onDeactivated(() => {
  unregister(props.focusKey)
})
</script>

<style scoped>
.tab-item {
  position: relative;
  padding: 8px 20px;
  font-size: 28px;
  color: #666;
  background: transparent;
  cursor: pointer;
  /*transition: all 0.3s ease;*/
  white-space: nowrap;
  user-select: none;
}

.tab-text {
  display: block;
  /* transition: all 0.3s ease; */
}

/* 底部指示器 */
.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 80%;
  height: 2px;
  background-color: #43609A;
  border-radius: 2px;
  /* transition: all 0.3s ease; */
}

/* 激活状态 */
.tab-item.active {
  color: #43609A;
  font-weight: bold;
}

.tab-item.active .tab-indicator {
  transform: translateX(-50%) scaleX(1);
}

/* 聚焦状态 */
.tab-item.focused {
  color: #43609A;
}

.tab-item.focused .tab-indicator {
  transform: translateX(-50%) scaleX(1);
  background: #43609A;
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.5);
}

/* 聚焦且激活 */
.tab-item.active.focused {
  color: #43609A;
}

.tab-item.active.focused .tab-indicator {
  height: 2px;
  box-shadow: 0 0 12px rgba(102, 126, 234, 0.8);
}

/* hover效果 */
.tab-item:hover {
  color: #667eea;
}
</style>
