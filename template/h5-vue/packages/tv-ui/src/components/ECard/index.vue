<template>
  <div
    ref="elRef"
    class="tv-focusable e-card"
    :class="{ 'is-focused': focused, 'has-image': !!image }"
    :style="{ width: cardWidth }"
    @click="handleClick"
  >
    <div v-if="image" class="e-card__media" :style="{ height: imageHeight }">
      <img :src="image" :alt="title" />
    </div>
    <div class="e-card__body">
      <slot>
        <div v-if="title" class="e-card__title">{{ title }}</div>
        <div v-if="description" class="e-card__desc">{{ description }}</div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFocusable } from '@shell/core/focus'

interface Props {
  focusKey?: string
  title?: string
  description?: string
  image?: string
  width?: number | string
  imageRatio?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 220,
  imageRatio: 1.4,
})

const emit = defineEmits<{
  enter: []
  click: []
}>()

const { elRef, focused } = useFocusable({
  focusKey: props.focusKey,
  onEnter: () => emit('enter'),
})

const cardWidth = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width,
)
const imageHeight = computed(() => {
  const w = typeof props.width === 'number' ? props.width : parseInt(props.width as string, 10)
  return `${Math.round(w / props.imageRatio)}px`
})

function handleClick() {
  emit('click')
}
</script>

<style scoped>
.e-card {
  background: var(--tv-color-surface);
  border-radius: var(--tv-radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.e-card__media {
  width: 100%;
  overflow: hidden;
  background: var(--tv-color-surface-hover);
}
.e-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.e-card__body { padding: 12px 14px; }
.e-card__title { font-size: 16px; color: var(--tv-color-text); margin-bottom: 4px; }
.e-card__desc { font-size: 13px; color: var(--tv-color-text-muted); }
</style>
