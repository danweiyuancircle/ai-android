<template>
  <div class="banner-container">
    <FocusableImage 
      v-for="(item, index) in items" 
      :key="`banner-${index}`"
      v-show="currentIndex === index" 
      :src="item.itemIcon" 
      :alt="item.itemTitle" 
      class="banner-image"
      @click="handleBannerClick(item)" 
    />

    <!-- 轮播指示器 -->
    <div v-if="showIndicators && items.length > 1" class="banner-indicators">
      <span 
        v-for="(item, index) in items" 
        :key="`indicator-${index}`"
        :class="['indicator', { active: currentIndex === index }]"
      ></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue'
import FocusableImage from './FocusableImage.vue'
import type { AreaItem } from '@shell/core'

// Props
interface Props {
  items: AreaItem[]
  autoPlay?: boolean
  interval?: number
  showIndicators?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoPlay: true,
  interval: 3000,
  showIndicators: true
})

// Emits
const emit = defineEmits<{
  click: [item: AreaItem]
  change: [index: number]
}>()

// 当前轮播索引
const currentIndex = ref(0)
let bannerTimer: number | null = null

// 启动自动轮播
const startAutoPlay = () => {
  if (!props.autoPlay || props.items.length <= 1) return

  stopAutoPlay() // 先清除之前的定时器
  bannerTimer = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % props.items.length
    emit('change', currentIndex.value)
  }, props.interval)
}

// 停止自动轮播
const stopAutoPlay = () => {
  if (bannerTimer) {
    clearInterval(bannerTimer)
    bannerTimer = null
  }
}

// 处理banner点击
const handleBannerClick = (item: AreaItem) => {
  emit('click', item)
}

// 监听items变化，重置索引
watch(() => props.items, () => {
  currentIndex.value = 0
  if (props.autoPlay) {
    startAutoPlay()
  }
})

// 生命周期
onMounted(() => {
  if (props.autoPlay) {
    startAutoPlay()
  }
})

onActivated(() => {
  if (props.autoPlay) {
    startAutoPlay()
  }
})

onDeactivated(() => {
  stopAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})

// 暴露方法供父组件调用
defineExpose({
  startAutoPlay,
  stopAutoPlay,
  currentIndex
})
</script>

<style scoped>
.banner-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: var(--focus-border-radius);
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* 轮播指示器 */
.banner-indicators {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  z-index: 10;
}

.banner-indicators > *:not(:first-child) {
  margin-left: 20px;
}

.indicator {
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator.active {
  background: rgba(255, 255, 255, 0.9);
  width: 50px;
}
</style>
