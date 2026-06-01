<template>
  <div
    ref="elRef"
    class="tv-focusable e-image"
    :class="{
      'is-focused': focused,
      'is-loading': !loaded && !error,
      'has-error': error,
      'has-focus-key': !!focusKey,
    }"
    :style="rootStyle"
    @click="handleClick"
  >
    <img
      v-if="currentSrc && !error"
      v-show="loaded"
      :src="currentSrc"
      :alt="alt"
      class="e-image__img"
      :style="imgStyle"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="error" class="e-image__error">
      <span>图片加载失败</span>
    </div>
    <div v-if="!loaded && !error" class="e-image__placeholder">
      <div class="e-image__spinner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useFocusable } from '@shell/core/focus'

interface Props {
  /** 焦点 key；无值时元素不参与焦点 */
  focusKey?: string
  src: string
  alt?: string
  /** 懒加载：在 mount 后延迟 N ms 才请求图片 */
  lazy?: boolean
  lazyDelay?: number
  width?: string | number
  height?: string | number
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  lazy: true,
  lazyDelay: 80,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
})

const emit = defineEmits<{
  enter: []
  click: []
  load: []
  error: []
  focus: []
  blur: []
}>()

const loaded = ref(false)
const error = ref(false)
const currentSrc = ref<string>('')

const { elRef, focused } = useFocusable({
  focusKey: props.focusKey,
  onEnter: () => emit('enter'),
  onFocus: () => emit('focus'),
  onBlur: () => emit('blur'),
})

function loadImage() {
  if (!props.src) {
    error.value = true
    return
  }
  loaded.value = false
  error.value = false
  currentSrc.value = props.src
}

function onLoad() {
  loaded.value = true
  emit('load')
}

function onError() {
  error.value = true
  emit('error')
}

function handleClick() {
  emit('click')
}

watch(() => props.src, loadImage)

onMounted(() => {
  if (props.lazy) {
    setTimeout(loadImage, props.lazyDelay)
  } else {
    loadImage()
  }
})

const rootStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))

const imgStyle = computed(() => ({
  objectFit: props.objectFit,
}))
</script>

<style scoped>
.e-image {
  border-radius: var(--tv-radius);
  overflow: hidden;
  background: var(--tv-color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}
.e-image__img {
  width: 100%;
  height: 100%;
  display: block;
}
.e-image__error,
.e-image__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tv-color-text-muted);
  font-size: 14px;
}
.e-image__error {
  color: var(--tv-color-error);
  background: rgba(248, 113, 113, 0.08);
}
.e-image__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--tv-color-surface-hover);
  border-top-color: var(--tv-color-focus);
  border-radius: 50%;
  animation: e-image-spin 0.9s linear infinite;
}
@keyframes e-image-spin {
  to { transform: rotate(360deg); }
}
</style>
