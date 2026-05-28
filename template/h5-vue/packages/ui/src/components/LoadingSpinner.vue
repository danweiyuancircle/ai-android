<template>
  <div class="loading-container" :class="containerClass">
    <div class="loading-spinner" :class="spinnerClass" :style="spinnerStyle"></div>
    <p v-if="text" class="loading-text" :style="textStyle">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 加载提示文字 */
  text?: string
  /** 主题：light(浅色背景) 或 dark(深色背景) */
  theme?: 'light' | 'dark'
  /** 尺寸：small、medium、large 或自定义数字(px) */
  size?: 'small' | 'medium' | 'large' | number
  /** 自定义颜色 */
  color?: string
  /** 容器类名 */
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  text: '加载中...',
  theme: 'light',
  size: 'medium'
})

// 尺寸映射
const sizeMap = {
  small: 30,
  medium: 40,
  large: 50
}

// 计算实际尺寸
const actualSize = computed(() => {
  if (typeof props.size === 'number') {
    return props.size
  }
  return sizeMap[props.size] || sizeMap.medium
})

// spinner 样式
const spinnerStyle = computed(() => {
  const size = actualSize.value
  const borderWidth = Math.max(3, Math.floor(size / 10))
  
  let borderColor = 'rgba(0, 0, 0, 0.1)'
  let borderTopColor = '#e9982b'
  
  if (props.theme === 'dark') {
    borderColor = 'rgba(255, 255, 255, 0.1)'
    borderTopColor = 'rgba(255, 255, 255, 0.6)'
  }
  
  // 如果提供了自定义颜色，使用自定义颜色
  if (props.color) {
    borderTopColor = props.color
  }
  
  return {
    width: `${size}px`,
    height: `${size}px`,
    border: `${borderWidth}px solid ${borderColor}`,
    borderTopColor: borderTopColor
  }
})

// spinner 类名
const spinnerClass = computed(() => {
  return `spinner-${props.theme}`
})

// 文字样式
const textStyle = computed(() => {
  return {
    color: props.theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#666'
  }
})
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-container > *:not(:first-child) {
  margin-top: 12px;
}

.loading-spinner {
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin: 0;
  font-size: 14px;
}
</style>
