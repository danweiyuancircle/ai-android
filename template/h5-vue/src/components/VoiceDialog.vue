<template>
  <Transition name="voice-slide">
    <div v-if="visible" class="voice-input-container">
      <div class="voice-input-box" :style="{ width: boxWidth }">
        <div class="voice-icon-wrapper">
          <img src="/img/ai/ic_input_micro_phone.gif" class="voice-icon" />
        </div>
        <div class="voice-text-wrapper" ref="textWrapperRef">
          <div class="voice-text" ref="textRef">{{ displayText }}</div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  text: string
}>()

const textRef = ref<HTMLElement | null>(null)
const textWrapperRef = ref<HTMLElement | null>(null)
const boxWidth = ref('300px')

// 显示文本：未输入文字显示"聆听中"，有文字则显示文字
const displayText = computed(() => {
  return props.text || '聆听中'
})

// 监听文字变化，动态调整宽度并滚动到末尾
watch(() => props.text, async () => {
  // 等待DOM更新
  await nextTick()
  // 更新宽度
  updateBoxWidth()
  // 再次等待宽度更新完成
  await nextTick()
  // 滚动到末尾
  scrollToEnd()
}, { immediate: true, flush: 'post' })

// 监听可见性变化
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    // 重置宽度
    boxWidth.value = '300px'
    // 等待宽度重置后再更新
    await nextTick()
    updateBoxWidth()
    await nextTick()
    scrollToEnd()
  }
}, { flush: 'post' })

/**
 * 更新输入框宽度
 * 根据文字长度动态调整，最小300px，最大不超过屏幕宽度（留出边距）
 */
const updateBoxWidth = () => {
  if (!textRef.value) return
  
  const textElement = textRef.value
  const minWidth = 300 // 最小宽度300px
  const maxWidth = window.innerWidth - 100 // 最大宽度（留出左右各50px边距）
  
  // 获取文字的实际宽度（scrollWidth会返回内容的完整宽度，即使被压缩）
  const textWidth = textElement.scrollWidth
  
  // 如果文字宽度为0，说明还没渲染，保持当前宽度或使用最小宽度
  if (textWidth === 0) {
    return
  }
  
  // 计算需要的宽度：图标宽度(60px) + gap(16px) + 内边距(30px * 2) + 文字宽度
  const iconWidth = 60
  const gap = 16
  const padding = 60 // 左右各30px
  const requiredWidth = iconWidth + gap + padding + textWidth
  
  // 限制在最小和最大宽度之间
  const finalWidth = Math.max(minWidth, Math.min(requiredWidth, maxWidth))
  
  boxWidth.value = `${finalWidth}px`
}

/**
 * 滚动到文字末尾，确保最后输入的文字始终显示
 */
const scrollToEnd = () => {
  if (!textWrapperRef.value) return
  
  const wrapper = textWrapperRef.value
  // 使用双重requestAnimationFrame确保DOM和样式更新完成
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 滚动到最右侧（末尾），显示最后输入的文字
      wrapper.scrollLeft = wrapper.scrollWidth
    })
  })
}
</script>

<style scoped>
.voice-input-container {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 9999;
  padding: 20px 0 20px 50px;
  pointer-events: none;
}

.voice-input-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--focus-border-radius);
  padding: 16px 30px;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  /* transition: width 0.3s ease; */
  pointer-events: auto;
}

.voice-input-box > *:not(:first-child) {
  margin-left: 6px;
}

.voice-icon-wrapper {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-icon {
  width: 60px;
  height: 60px;
}

.voice-text-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.voice-text-wrapper::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.voice-text {
  font-size: 28px;
  color: #272727;
  line-height: 1.5;
  white-space: nowrap; /* 单行显示，不换行 */
  min-width: min-content; /* 确保文字不会被压缩 */
}

/* 过渡动画 - 从底部滑入 */
.voice-slide-enter-active {
  transition: all 0.3s ease;
}

.voice-slide-leave-active {
  transition: all 0.3s ease;
}

.voice-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.voice-slide-enter-to {
  transform: translateY(0);
  opacity: 1;
}

.voice-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.voice-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
