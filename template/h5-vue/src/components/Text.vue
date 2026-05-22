<template>
  <div :class="['text-ellipsis', customClass]" :style="computedStyle">
    <slot>{{ text }}</slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * 显示的文本内容（如果使用插槽，则忽略此属性）
   */
  text?: string
  /**
   * 显示的行数，指定后超出则显示省略号；不指定则文字自适应显示
   */
  lines?: number
  /**
   * 自定义类名
   */
  customClass?: string
  /**
   * 文本对齐方式
   */
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  /**
   * 文本颜色
   */
  color?: string
  /**
   * 字体大小（px）
   */
  fontSize?: number
  /**
   * 行高（可以是数字或字符串，如 1.5 或 '24px'）
   */
  lineHeight?: number | string
  /**
   * 字体粗细
   */
  fontWeight?: number | string
  /**
   * 换行方式（仅在指定了 lines 且 lines > 1 时有效）
   */
  wordBreak?: 'normal' | 'break-all' | 'break-word' | 'keep-all'
  /**
   * 自定义样式对象
   */
  customStyle?: Record<string, string | number>
}

const props = withDefaults(defineProps<Props>(), {
  textAlign: 'left',
  wordBreak: 'normal',
})

// 计算样式
const computedStyle = computed(() => {
  const style: Record<string, string | number> = {
    ...props.customStyle
  }

  // 行数相关样式：只有当 lines 有值时才应用截断样式
  if (props.lines !== undefined) {
    // 多行截断：超出指定行数显示省略号
    style.display = '-webkit-box'
    style.webkitLineClamp = props.lines
    style.lineClamp = props.lines
    style.webkitBoxOrient = 'vertical'
    style.overflow = 'hidden'
    style.textOverflow = 'ellipsis'
  }

  // 文本对齐
  if (props.textAlign) {
    style.textAlign = props.textAlign
  }

  // 文本颜色
  if (props.color) {
    style.color = props.color
  }

  // 字体大小
  if (props.fontSize) {
    style.fontSize = `${props.fontSize}px`
  }

  // 行高
  if (props.lineHeight !== undefined) {
    if (typeof props.lineHeight === 'number') {
      style.lineHeight = props.lineHeight
    } else {
      style.lineHeight = props.lineHeight
    }
  }

  // 字体粗细
  if (props.fontWeight !== undefined) {
    style.fontWeight = props.fontWeight
  }

  // 换行方式（仅在指定了 lines 且 lines > 1 时有效）
  if (props.wordBreak && props.lines !== undefined && props.lines > 1) {
    style.wordBreak = props.wordBreak
  }

  return style
})
</script>

<style scoped>
.text-ellipsis {
  margin: 0;
  padding: 0;
}
</style>
