<template>
  <div :class="[
    'focusable-image',
    {
      'focusable-base': focusKey && !hideFocusBorder,
      'focused-inner-scale': focusKey,
      'focused-default': isFocused && focusKey,
      // 'no-focus-effect': hideFocusBorder,
      'loading': isLoading,
      'error': hasError
    }
  ]" :data-focus-key="focusKey" @click="handleClick">
    <!-- 错误状态 -->
    <div v-if="hasError" class="image-error">
      <img src="/img/ic_error_img.svg" alt="加载失败" class="error-image" />
    </div>
    <img 
      v-if="currentSrc"
      v-show="imageLoaded && !hasError" 
      :src="currentSrc" 
      :alt="alt" 
      class="image-content inner-element"
      @load="handleImageLoad" 
      @error="handleImageError" 
    />
    <!-- 占位图（图片未加载时） -->
    <div v-if="!imageLoaded && !hasError" class="image-placeholder">
      <div class="placeholder-icon"></div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, onActivated, onDeactivated } from 'vue'
import { useFocusable } from '@shell/core'

interface Props {
  focusKey?: string
  src: string
  alt?: string
  lazy?: boolean
  placeholder?: string
  width?: string
  height?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  groupId?: string // 焦点分组ID
  hideFocusBorder?: boolean // 是否隐藏焦点框
  // 边缘事件处理器（作为props传入，可以返回boolean）
  onEdgeLeft?: () => boolean
  onEdgeRight?: () => boolean
  onEdgeUp?: () => boolean
  onEdgeDown?: () => boolean
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  focusKey: undefined,
  lazy: true,
  placeholder: '',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  hideFocusBorder: false
})

const emit = defineEmits(['click', 'load', 'error', 'focus', 'blur'])

const isFocused = ref(false)
const isLoading = ref(true)
const hasError = ref(false)
const imageLoaded = ref(false)
const currentSrc = ref('')

const { register, unregister } = useFocusable()

// 处理焦点
const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

const handleClick = () => {
  emit('click')
}

// 图片加载成功
const handleImageLoad = () => {
  isLoading.value = false
  hasError.value = false
  imageLoaded.value = true
  emit('load')
}

// 图片加载失败
const handleImageError = () => {
  isLoading.value = false
  hasError.value = true
  imageLoaded.value = false
  emit('error')
}

// 加载图片
const loadImage = () => {
  if (!props.src) {
    hasError.value = true
    isLoading.value = false
    currentSrc.value = '' // 确保不设置空字符串，避免触发 error 事件
    return
  }
  isLoading.value = true
  hasError.value = false
  imageLoaded.value = false
  currentSrc.value = props.src
}

// 监听 src 变化
watch(() => props.src, () => {
  loadImage()
})

// 注册焦点
const registerFocus = () => {
  register(props.focusKey || '', {
    groupId: props.groupId,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onEnter: handleClick,
    onEdgeLeft: props.onEdgeLeft,
    onEdgeRight: props.onEdgeRight,
    onEdgeUp: props.onEdgeUp,
    onEdgeDown: props.onEdgeDown
  })
}

onMounted(() => {
  registerFocus()

  // 如果不是懒加载，立即加载图片
  if (!props.lazy) {
    loadImage()
  } else {
    // 懒加载逻辑（简化版，实际可以用 IntersectionObserver）
    setTimeout(() => {
      loadImage()
    }, 100)
  }
})

onUnmounted(() => {
  unregister(props.focusKey || '')
})

onActivated(() => {
  registerFocus()
})
onDeactivated(() => {
  unregister(props.focusKey || '')
})

</script>

<style scoped>
.focusable-image {
  position: relative;
  width: v-bind(width);
  height: v-bind(height);
  overflow: hidden;
  background: rgba(145, 29, 29, 0.05);
  display: flex;
  align-items: center;
  border-radius: var(--focus-border-radius);
  justify-content: center;
}

.focusable-image.focusable-base {
  border: 4px solid transparent;
}

/* 隐藏焦点框时，移除边框和焦点效果 */
.focusable-image.no-focus-effect {
  border: none !important;
}

.focusable-image.no-focus-effect.focused-default {
  border: none !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 图片内容 */
.image-content {
  width: 100%;
  height: 100%;
  object-fit: v-bind(objectFit);
}

/* 错误状态 */
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
}

.error-image {
  width: 60px;
  height: 60px;
  object-fit: contain;
}


/* 占位图 */
.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.03);
}

.placeholder-icon {
  font-size: 64px;
  opacity: 0.3;
}
</style>
